# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Server-side Arena (anti-cheat MVP)

В проект добавлен Python-сервер `server/`, который:

- проверяет `Bearer` токен Supabase (JWT) по JWKS
- сам рассчитывает результат боя на Арене (MVP-симуляция)
- записывает результат в Supabase (`profiles.arena_rating`, `profiles.game_data.arenaState`, `arena_battle_history`)

### Запуск сервера локально

Создай переменные окружения:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (держать только на сервере)
- `CORS_ORIGINS` (например `http://localhost:5173`)

Запуск:

```bash
cd server
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

### Подключение фронта

Укажи URL сервера:

- `VITE_SERVER_URL=http://localhost:8000`

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Публикация Android-версии в RuStore

Проект использует Capacitor и собирается в Android App Bundle (AAB).

### 1) Проверьте идентификатор пакета (обязательно уникальный)

Сейчас выставлено `ru.slavictales.bylina`:

- `capacitor.config.ts` (`appId`)
- `android/app/build.gradle` (`namespace`, `applicationId`)
- `android/app/src/main/res/values/strings.xml` (`package_name`, `custom_url_scheme`)

Если у вас есть свой домен/организация — замените на ваш reverse-domain идентификатор.

### 2) Соберите релизный AAB

```bash
npm ci
npm run android:aab:release
```

После сборки файл будет в `android/app/build/outputs/bundle/release/app-release.aab`.

### 3) Подпись для RuStore (ZIP + PEM)

В RuStore AAB загружается вместе с:

- ZIP-архивом подписи приложения (PEPK output)
- сертификатом ключа загрузки в формате PEM

Инструкция RuStore по загрузке AAB и подготовке подписи:
- Требования к приложениям: `https://www.rustore.ru/help/developers/publishing-and-verifying-apps/requirement-apps/`
- Загрузка AAB и подписи: `https://www.rustore.ru/help/developers/publishing-and-verifying-apps/app-publication/new-version-app/upload-aab`

Подпись релиза в проекте настраивается через:

- переменные окружения `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`, или
- локальный файл `android/keystore.properties` (он добавлен в `.gitignore`, не коммитьте его)

### 4) Перед отправкой на модерацию

- Убедитесь, что приложение стабильно работает и соответствует заявленному описанию/скриншотам.
- Если есть авторизация — подготовьте тестовый аккаунт для модераторов (RuStore это просит в комментариях модерации).
- Проверьте, что вы не запрашиваете лишние разрешения (в `AndroidManifest.xml` сейчас только `INTERNET`).
