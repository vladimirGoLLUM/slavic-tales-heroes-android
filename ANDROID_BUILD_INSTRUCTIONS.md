# Android Build Instructions

## Generating Signed APK

This document outlines the process for generating a signed APK for the Android application using secure signing practices with environment variables.

### Signing Configuration

The signing configuration has been implemented in `android/app/build.gradle` with the following features:

1. **Environment Variable Support**: The build script reads signing information from environment variables
2. **Base64-encoded Keystore**: The keystore file is provided as a Base64-encoded string to avoid binary file handling in CI/CD
3. **Fallback for Local Development**: Supports a local `keystore.properties` file for development environments
4. **Release-only Signing**: Signing configuration is only applied to release builds

### Required Environment Variables

The following environment variables must be set for successful APK generation:

| Variable Name | Description | Source |
|---------------|-----------|--------|
| `ANDROID_KEYSTORE_BASE64` | Base64-encoded keystore file | Generated from keystore file |
| `ANDROID_KEYSTORE_PASSWORD` | Password for the keystore | Keystore creation |
| `ANDROID_KEY_ALIAS` | Alias name for the key in the keystore | Keystore creation |
| `ANDROID_KEY_PASSWORD` | Password for the key | Keystore creation |

### Setting Up the Keystore

#### 1. Generate a New Keystore (if needed)

```bash
keytool -genkey -v -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

#### 2. Convert Keystore to Base64

```bash
# On Linux/Mac
base64 my-release-key.keystore > keystore.base64

# On Windows
certutil -encode my-release-key.keystore keystore.base64
# Then remove header and footer lines from keystore.base64
```

#### 3. Set Up GitHub Secrets

1. Go to your repository on GitHub
2. Navigate to Settings > Secrets and variables > Actions
3. Click "New repository secret" and add the following secrets:
   - `ANDROID_KEYSTORE_BASE64`: Content of the base64-encoded keystore file
   - `ANDROID_KEYSTORE_PASSWORD`: Password for the keystore
   - `ANDROID_KEY_ALIAS`: Alias name used when creating the keystore
   - `ANDROID_KEY_PASSWORD`: Password for the key

### Build Commands

#### Local Development (using keystore.properties)

1. Create a `keystore.properties` file in the project root:

```properties
storeFile=relative/path/to/your/keystore.jks
storePassword=your_store_password
keyAlias=your_key_alias
keyPassword=your_key_password
```

2. Build the signed APK:

```bash
# Navigate to android directory
cd android

# Build release APK
./gradlew assembleRelease
```

#### CI/CD Build (using environment variables)

The CI/CD process automatically sets the required environment variables from GitHub Secrets and builds the APK. The environment variables used are:

- `ANDROID_KEYSTORE_BASE64`: Base64-encoded keystore file from `ANDROID_KEYSTORE_BASE64` secret
- `ANDROID_KEYSTORE_PASSWORD`: Keystore password from `ANDROID_KEYSTORE_PASSWORD` secret
- `ANDROID_KEY_ALIAS`: Key alias from `ANDROID_KEY_ALIAS` secret
- `ANDROID_KEY_PASSWORD`: Key password from `ANDROID_KEY_PASSWORD` secret

The build command executed in CI/CD:

```bash
cd android
./gradlew.bat assembleRelease
```

The generated APK is located at:
`android/app/build/outputs/apk/release/app-release.apk`

This file is automatically attached to GitHub releases when creating a tag.

### GitHub Actions Workflow

The project includes a GitHub Actions workflow at `.github/workflows/android-release.yml` that automatically builds and signs the APK. The workflow is triggered by:

- Pushes to the `main` branch
- Creation of tags matching the pattern `v*.*.*`
- Manual dispatch through the GitHub Actions interface

The workflow handles the complete build process including:

1. Checking out the code
2. Setting up Node.js and installing dependencies
3. Configuring Java 17 and Android SDK
4. Building web assets and syncing with Capacitor
5. Building the signed APK using Gradle with environment variables
6. Creating a GitHub release when tagging (for tags starting with 'v')

The signing process is now fully integrated into the Gradle build process, eliminating the need for separate signing actions.

### Security Best Practices

- Never commit keystore files or passwords to version control
- Use different keystores for development and production
- Keep the keystore file in a secure location
- Regularly back up the keystore file
- Use strong passwords for the keystore and key

### Troubleshooting

- **Keystore not found**: Ensure the ANDROID_KEYSTORE_BASE64 environment variable is correctly set
- **Invalid password**: Verify all password environment variables are correct
- **Build fails in CI**: Check that all required secrets are configured in GitHub Secrets
- **Signing config not applied**: Ensure you're building the release variant with `assembleRelease`
