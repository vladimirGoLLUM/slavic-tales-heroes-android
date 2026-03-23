import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BOT_CONFIGS = [
  { email: "bot1@bylina.bot", username: "Ярослав" },
  { email: "bot2@bylina.bot", username: "Велимира" },
  { email: "bot3@bylina.bot", username: "Добрыня" },
  { email: "bot4@bylina.bot", username: "Златослава" },
  { email: "bot5@bylina.bot", username: "Святогор" },
  { email: "bot6@bylina.bot", username: "Василиса" },
  { email: "bot7@bylina.bot", username: "Микула" },
  { email: "bot8@bylina.bot", username: "Забава" },
  { email: "bot9@bylina.bot", username: "Вольга" },
  { email: "bot10@bylina.bot", username: "Снежана" },
];

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const today = getTodayStr();
    const results: string[] = [];

    for (const bot of BOT_CONFIGS) {
      // 1. Find or create bot auth user
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find((u: any) => u.email === bot.email);

      let botUserId: string;

      if (existingUser) {
        botUserId = existingUser.id;
      } else {
        const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
          email: bot.email,
          password: `BotPass_${bot.username}_${Date.now()}`,
          email_confirm: true,
          user_metadata: { username: bot.username },
        });
        if (createErr || !newUser?.user) {
          results.push(`Failed to create ${bot.username}: ${createErr?.message}`);
          continue;
        }
        botUserId = newUser.user.id;
      }

      // 2. Get current profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("arena_rating, arena_power")
        .eq("id", botUserId)
        .maybeSingle();

      if (profile) {
        // Small incremental growth like a real player
        // Arena: gain +0 to +10 rating per cycle (with occasional small losses)
        const ratingDelta = randInt(-5, 10);
        const newRating = Math.max(0, (profile.arena_rating || 0) + ratingDelta);

        // Power grows slowly: +50 to +300 per cycle
        const powerGrowth = randInt(50, 300);
        const newPower = (profile.arena_power || 0) + powerGrowth;

        await supabase
          .from("profiles")
          .update({
            username: bot.username,
            arena_rating: newRating,
            arena_power: newPower,
            updated_at: new Date().toISOString(),
          })
          .eq("id", botUserId);
      }

      // 3. World boss damage — small realistic amounts
      for (const bossId of ["hydra", "cerberus"]) {
        const { data: bossData } = await supabase
          .from("world_boss_damage")
          .select("*")
          .eq("user_id", botUserId)
          .eq("boss_id", bossId)
          .maybeSingle();

        // Realistic damage: 5k-50k based on low-level heroes
        const dailyDmg = randInt(5000, 50000);

        if (!bossData) {
          await supabase.from("world_boss_damage").insert({
            user_id: botUserId,
            boss_id: bossId,
            damage_today: dailyDmg,
            damage_total: dailyDmg,
            attacks_used: 3,
            last_attack_date: today,
            rewards_claimed: false,
          });
        } else if (bossData.last_attack_date !== today) {
          await supabase
            .from("world_boss_damage")
            .update({
              damage_today: dailyDmg,
              damage_total: bossData.damage_total + dailyDmg,
              attacks_used: 3,
              last_attack_date: today,
              rewards_claimed: false,
              updated_at: new Date().toISOString(),
            })
            .eq("id", bossData.id);
        }
      }

      results.push(`✓ ${bot.username} (${botUserId})`);
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
