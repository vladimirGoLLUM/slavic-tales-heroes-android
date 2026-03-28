from __future__ import annotations

import hashlib
import random
import time
from typing import Any, Literal

import httpx
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from jose import jwt
from jose.exceptions import JWTError
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="", case_sensitive=False)

    SUPABASE_URL: str = Field(..., description="https://xxxx.supabase.co")
    SUPABASE_SERVICE_ROLE_KEY: str = Field(..., description="Supabase service role key (server-only)")
    SUPABASE_JWKS_URL: str | None = Field(
        default=None,
        description="Optional override. Defaults to {SUPABASE_URL}/auth/v1/.well-known/jwks.json",
    )
    CORS_ORIGINS: str = Field(default="*", description="Comma-separated origins or *")


settings = Settings()

app = FastAPI(title="Bylina Server", version="0.1.0")

origins = [o.strip() for o in settings.CORS_ORIGINS.split(",")] if settings.CORS_ORIGINS != "*" else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _jwks_url() -> str:
    return settings.SUPABASE_JWKS_URL or f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"


_jwks_cache: dict[str, Any] | None = None
_jwks_cache_at: float = 0.0


async def _get_jwks() -> dict[str, Any]:
    global _jwks_cache, _jwks_cache_at
    now = time.time()
    if _jwks_cache and (now - _jwks_cache_at) < 3600:
        return _jwks_cache
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(_jwks_url())
        r.raise_for_status()
        _jwks_cache = r.json()
        _jwks_cache_at = now
        return _jwks_cache


async def _verify_supabase_jwt(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1].strip()
    jwks = await _get_jwks()
    try:
        unverified = jwt.get_unverified_header(token)
        kid = unverified.get("kid")
        if not kid:
            raise HTTPException(status_code=401, detail="Invalid token header")
        key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
        if not key:
            # JWKS may have rotated; refresh once
            global _jwks_cache_at
            _jwks_cache_at = 0
            jwks = await _get_jwks()
            key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
        if not key:
            raise HTTPException(status_code=401, detail="Unknown signing key")

        claims = jwt.decode(
            token,
            key,
            algorithms=[unverified.get("alg", "RS256")],
            options={"verify_aud": False},
        )
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    sub = claims.get("sub")
    if not sub or not isinstance(sub, str):
        raise HTTPException(status_code=401, detail="Invalid token subject")
    return sub


async def current_user_id(authorization: str | None = Header(default=None)) -> str:
    return await _verify_supabase_jwt(authorization)


def _rest_headers() -> dict[str, str]:
    # service role bypasses RLS; must never be exposed to clients
    return {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }


async def _sb_select_profile(user_id: str) -> dict[str, Any]:
    url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/profiles"
    params = {"select": "id,username,arena_rating,arena_squad,game_data", "id": f"eq.{user_id}"}
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(url, params=params, headers=_rest_headers())
        r.raise_for_status()
        rows = r.json()
        if not rows:
            raise HTTPException(status_code=404, detail="Profile not found")
        return rows[0]


async def _sb_update_profile(user_id: str, patch: dict[str, Any]) -> None:
    url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/profiles"
    params = {"id": f"eq.{user_id}"}
    headers = _rest_headers() | {"Prefer": "return=minimal"}
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.patch(url, params=params, headers=headers, json=patch)
        r.raise_for_status()


async def _sb_insert_arena_history(row: dict[str, Any]) -> None:
    url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/arena_battle_history"
    headers = _rest_headers() | {"Prefer": "return=minimal"}
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.post(url, headers=headers, json=row)
        r.raise_for_status()


class Stats(BaseModel):
    hp: int
    atk: int
    def_: int = Field(alias="def")
    spd: int
    critChance: float = 15
    critDmg: float = 50
    resistance: float = 0
    accuracy: float = 0


class Skill(BaseModel):
    name: str
    type: Literal["damage", "aoe", "heal", "buff", "debuff", "control", "passive"]
    power: float = 1.0
    cooldown: int = 0


class ArenaChampion(BaseModel):
    id: str
    name: str
    element: str
    rarity: str
    imageUrl: str | None = None
    baseStats: Stats
    skills: list[Skill]


class ArenaResolveRequest(BaseModel):
    opponent_id: str = Field(..., description="arena-db-<uuid>-... (DB opponents only in MVP)")


class ArenaResolveResponse(BaseModel):
    result: Literal["win", "loss"]
    rating_delta: int
    new_rating: int
    coin_tier: str
    server_seed: str


def _element_multiplier(attacker: str, defender: str) -> float:
    # MVP: keep neutral to avoid mismatches; can be upgraded to match client table.
    if attacker == defender:
        return 1.0
    if (attacker == "Свет" and defender == "Тень") or (attacker == "Тень" and defender == "Свет"):
        return 1.25
    return 1.0


def _damage(rng: random.Random, atk: Stats, dfn: Stats, power: float, atk_el: str, def_el: str) -> int:
    dmg = float(atk.atk) * float(power)
    # crit
    if rng.random() * 100.0 < float(atk.critChance):
        dmg *= 1.0 + float(atk.critDmg) / 100.0
    dmg *= _element_multiplier(atk_el, def_el)
    # defense reduction (match shape of client formula)
    reduced_def = float(dfn.def_)
    def_reduction = reduced_def / (reduced_def + 150.0) if reduced_def > 0 else 0.0
    after_def = dmg * (1.0 - def_reduction * 0.6)
    return max(1, int(after_def))


def _simulate_arena(seed: str, attackers: list[ArenaChampion], defenders: list[ArenaChampion]) -> bool:
    rng = random.Random(seed)

    class Unit:
        def __init__(self, champ: ArenaChampion, is_def: bool):
            self.c = champ
            self.is_def = is_def
            self.hp = champ.baseStats.hp
            self.max_hp = champ.baseStats.hp
            self.cd = [0 for _ in champ.skills]
            self.tm = 0.0

        @property
        def alive(self) -> bool:
            return self.hp > 0

        @property
        def spd(self) -> int:
            return max(1, int(self.c.baseStats.spd))

    units: list[Unit] = [Unit(c, False) for c in attackers] + [Unit(c, True) for c in defenders]
    TM_THRESHOLD = 1000.0

    def living(side_def: bool) -> list[Unit]:
        return [u for u in units if u.is_def == side_def and u.alive]

    def choose_skill(u: Unit) -> int:
        # prefer strongest available damage/aoe, otherwise first non-passive
        best = 0
        best_p = -1.0
        for i, s in enumerate(u.c.skills):
            if u.cd[i] != 0:
                continue
            if s.type in ("damage", "aoe") and s.power > best_p:
                best_p = s.power
                best = i
        return best

    def choose_target(u: Unit) -> Unit:
        enemies = living(not u.is_def)
        # focus lowest hp%
        return min(enemies, key=lambda e: (e.hp / max(1, e.max_hp), e.hp))

    turns = 0
    while turns < 1000:
        turns += 1
        if not living(False):
            return False
        if not living(True):
            return True

        # progress turn meters
        for u in units:
            if not u.alive:
                continue
            u.tm += float(u.spd)

        acting = max((u for u in units if u.alive), key=lambda x: x.tm)
        if acting.tm < TM_THRESHOLD:
            continue
        acting.tm -= TM_THRESHOLD

        # cooldown tick (end of own turn in client; MVP: tick before use to keep bounded)
        acting.cd = [max(0, c - 1) for c in acting.cd]

        skill_idx = choose_skill(acting)
        skill = acting.c.skills[skill_idx] if skill_idx < len(acting.c.skills) else None
        if not skill or skill.type == "passive":
            continue

        if skill.cooldown and skill.cooldown > 0:
            acting.cd[skill_idx] = int(skill.cooldown)

        if skill.type == "heal":
            allies = living(acting.is_def)
            if not allies:
                continue
            target = min(allies, key=lambda a: (a.hp / max(1, a.max_hp), a.hp))
            heal = max(1, int(float(acting.c.baseStats.atk) * float(skill.power)))
            target.hp = min(target.max_hp, target.hp + heal)
            continue

        if skill.type == "aoe":
            for enemy in living(not acting.is_def):
                d = _damage(rng, acting.c.baseStats, enemy.c.baseStats, skill.power, acting.c.element, enemy.c.element)
                enemy.hp -= d
            continue

        # single target damage
        enemy = choose_target(acting)
        d = _damage(rng, acting.c.baseStats, enemy.c.baseStats, skill.power, acting.c.element, enemy.c.element)
        enemy.hp -= d

    # Safety: if too long, declare loss for attacker (prevents farming by stalling)
    return False


def _parse_arena_db_opponent(opponent_id: str) -> str:
    # arena-db-<uuid>-<timestamp>-<i>
    if not opponent_id.startswith("arena-db-"):
        raise HTTPException(status_code=400, detail="MVP supports only DB opponents (arena-db-...)")
    parts = opponent_id.split("-")
    if len(parts) < 7:
        raise HTTPException(status_code=400, detail="Invalid opponent id")
    # uuid has 5 dash-separated parts
    defender_uuid = "-".join(parts[2:7])
    return defender_uuid


def _arena_coin_tier_from_rating(rating: int) -> str:
    if rating >= 4000:
        return "Лунный Мефрил"
    if rating >= 3000:
        return "Пламень-Сталь"
    if rating >= 2000:
        return "Червонное Золото"
    if rating >= 1000:
        return "Кованое Серебро"
    return "Ярь-Медь"


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/arena/resolve", response_model=ArenaResolveResponse)
async def arena_resolve(req: ArenaResolveRequest, user_id: str = Depends(current_user_id)) -> ArenaResolveResponse:
    attacker = await _sb_select_profile(user_id)
    defender_id = _parse_arena_db_opponent(req.opponent_id)
    defender = await _sb_select_profile(defender_id)

    atk_squad_raw = attacker.get("arena_squad") or []
    def_squad_raw = defender.get("arena_squad") or []
    if not isinstance(atk_squad_raw, list) or not isinstance(def_squad_raw, list):
        raise HTTPException(status_code=400, detail="Invalid arena squads")

    try:
        atk_squad = [ArenaChampion.model_validate(x) for x in atk_squad_raw][:4]
        def_squad = [ArenaChampion.model_validate(x) for x in def_squad_raw][:4]
    except Exception:
        raise HTTPException(status_code=400, detail="Arena squad schema mismatch")
    if not atk_squad or not def_squad:
        raise HTTPException(status_code=400, detail="Empty arena squad")

    # deterministic seed: attacker+defender+opponentId+day
    day = time.strftime("%Y-%m-%d", time.gmtime())
    seed_src = f"{user_id}:{defender_id}:{req.opponent_id}:{day}"
    seed = hashlib.sha256(seed_src.encode("utf-8")).hexdigest()[:16]

    attacker_win = _simulate_arena(seed, atk_squad, def_squad)

    attacker_rating = int(attacker.get("arena_rating") or 0)
    rating_delta = 10 if attacker_win else -8
    new_rating = max(0, attacker_rating + rating_delta)
    coin_tier = _arena_coin_tier_from_rating(attacker_rating)

    # Patch game_data.arenaState if present
    game_data = attacker.get("game_data") or {}
    if not isinstance(game_data, dict):
        game_data = {}
    arena_state = game_data.get("arenaState") or {}
    if not isinstance(arena_state, dict):
        arena_state = {}

    # mark opponent defeated if found
    opps = arena_state.get("arenaOpponents")
    if isinstance(opps, list):
        new_opps = []
        for o in opps:
            if isinstance(o, dict) and o.get("id") == req.opponent_id:
                new_opps.append({**o, "defeated": True})
            else:
                new_opps.append(o)
        arena_state["arenaOpponents"] = new_opps

    # update rating + coin count on win only
    arena_state["arenaRating"] = new_rating
    if attacker_win:
        coins = arena_state.get("arenaCoins") or {}
        if not isinstance(coins, dict):
            coins = {}
        coins[coin_tier] = int(coins.get(coin_tier) or 0) + 1
        arena_state["arenaCoins"] = coins

    game_data["arenaState"] = arena_state

    await _sb_update_profile(user_id, {"arena_rating": new_rating, "game_data": game_data, "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())})

    # write battle history
    await _sb_insert_arena_history(
        {
            "attacker_id": user_id,
            "defender_id": defender_id,
            "attacker_name": attacker.get("username") or "",
            "defender_name": defender.get("username") or "",
            "attacker_rating": attacker_rating,
            "defender_rating": int(defender.get("arena_rating") or 0),
            "rating_change": abs(rating_delta),
            "result": "win" if attacker_win else "loss",
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
    )

    return ArenaResolveResponse(
        result="win" if attacker_win else "loss",
        rating_delta=rating_delta,
        new_rating=new_rating,
        coin_tier=coin_tier,
        server_seed=seed,
    )

