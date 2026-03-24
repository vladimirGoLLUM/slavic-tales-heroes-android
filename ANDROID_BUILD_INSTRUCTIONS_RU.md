# Инструкции по сборке Android

## Генерация подписанного APK

Этот документ описывает процесс генерации подписанного APK для Android-приложения с использованием безопасных методов подписи с переменными окружения.

### Конфигурация подписи

Конфигурация подписи реализована в `android/app/build.gradle` со следующими возможностями:

1. **Поддержка переменных окружения**: Скрипт сборки считывает информацию о подписи из переменных окружения
2. **Keystore в формате Base64**: Файл keystore предоставляется в виде строки, закодированной в Base64, чтобы избежать работы с бинарными файлами в CI/CD
3. **Резервный вариант для локальной разработки**: Поддерживает локальный файл `keystore.properties` для сред разработки
4. **Подпись только для релизов**: Конфигурация подписи применяется только к релизным сборкам

### Требуемые переменные окружения

Для успешной генерации APK необходимо установить следующие переменные окружения:

| Имя переменной | Описание | Источник |
|---------------|-----------|--------|
| `ANDROID_KEYSTORE_BASE64` | Файл keystore, закодированный в Base64 | Сгенерирован из файла keystore |
| `ANDROID_KEYSTORE_PASSWORD` | Пароль для keystore | Создание keystore |
| `ANDROID_KEY_ALIAS` | Имя алиаса ключа в keystore | Создание keystore |
| `ANDROID_KEY_PASSWORD` | Пароль для ключа | Создание keystore |

### Настройка Keystore

#### 1. Генерация нового Keystore (при необходимости)

```bash
keytool -genkey -v -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

#### 2. Преобразование Keystore в Base64

```bash
# На Linux/Mac
base64 my-release-key.keystore > keystore.base64

# На Windows
certutil -encode my-release-key.keystore keystore.base64
# Затем удалите строки заголовка и футера из keystore.base64
```

#### 3. Настройка секретов GitHub

1. Перейдите в репозиторий на GitHub
2. Перейдите в Settings > Secrets and variables > Actions
3. Нажмите "New repository secret" и добавьте следующие секреты:
   - `ANDROID_KEYSTORE_BASE64`: Содержимое файла keystore, закодированного в base64
   - `ANDROID_KEYSTORE_PASSWORD`: Пароль для keystore
   - `ANDROID_KEY_ALIAS`: Имя алиаса, использованное при создании keystore
   - `ANDROID_KEY_PASSWORD`: Пароль для ключа

### Команды сборки

#### Локальная разработка (с использованием keystore.properties)

1. Создайте файл `keystore.properties` в корне проекта:

```properties
storeFile=relative/path/to/your/keystore.jks
storePassword=your_store_password
keyAlias=your_key_alias
keyPassword=your_key_password
```

2. Соберите подписанный APK:

```bash
# Перейдите в каталог android
cd android

# Соберите релизный APK
./gradlew assembleRelease
```

#### Сборка CI/CD (с использованием переменных окружения)

Процесс CI/CD автоматически устанавливает необходимые переменные окружения из секретов GitHub и собирает APK. Используемые переменные окружения:

- `ANDROID_KEYSTORE_BASE64`: Файл keystore в формате base64 из секрета `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`: Пароль keystore из секрета `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`: Алиас ключа из секрета `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`: Пароль ключа из секрета `ANDROID_KEY_PASSWORD`

Команда сборки, выполняемая в CI/CD:

```bash
cd android
./gradlew.bat assembleRelease
```

Сгенерированный APK находится по адресу:
`android/app/build/outputs/apk/release/app-release.apk`

Этот файл автоматически прикрепляется к релизам GitHub при создании тега.

### Рабочий процесс GitHub Actions

Проект включает рабочий процесс GitHub Actions по адресу `.github/workflows/android-release.yml`, который автоматически собирает и подписывает APK. Рабочий процесс запускается при:

- Push в ветку `main`
- Создании тегов, соответствующих шаблону `v*.*.*`
- Ручном запуске через интерфейс GitHub Actions

Рабочий процесс обрабатывает полный процесс сборки, включая:

1. Клонирование кода
2. Настройку Node.js и установку зависимостей
3. Настройку Java 17 и Android SDK
4. Сборку веб-ресурсов и синхронизацию с Capacitor
5. Сборку подписанного APK с помощью Gradle с переменными окружения
6. Создание релиза GitHub при тегировании (для тегов, начинающихся с 'v')

Процесс подписи теперь полностью интегрирован в процесс сборки Gradle, что устраняет необходимость в отдельных действиях подписи.

### Рекомендации по безопасности

- Никогда не коммитьте файлы keystore или пароли в систему контроля версий
- Используйте разные keystore для разработки и продакшена
- Храните файл keystore в безопасном месте
- Регулярно делайте резервные копии файла keystore
- Используйте надежные пароли для keystore и ключа

### Устранение неполадок

- **Keystore не найден**: Убедитесь, что переменная окружения ANDROID_KEYSTORE_BASE64 установлена правильно
- **Неверный пароль**: Проверьте, что все переменные окружения с паролями указаны верно
- **Сборка падает в CI**: Проверьте, что все необходимые секреты настроены в GitHub Secrets
- **Конфигурация подписи не применяется**: Убедитесь, что вы собираете релизный вариант с помощью `assembleRelease`