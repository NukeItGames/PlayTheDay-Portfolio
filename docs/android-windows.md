# Android on Windows

Install Android Studio, SDK platform tools, and an emulator. Set `ANDROID_HOME` to your SDK directory, or use the default `%LOCALAPPDATA%\Android\Sdk`. Create an AVD named `PlayTheDay_Pixel_8`, or pass another name:

```powershell
powershell -NoProfile -File .\scripts\start-android.ps1 -DeviceName Your_AVD -Port 8082
```

The included VS Code task runs the same launcher with its defaults. It waits for the emulator to boot and starts Expo Go using ADB port forwarding. Keep its terminal open; Ctrl+C stops Metro, and the emulator closes separately. Use Expo Go compatible with SDK 57.

The launcher is retained as an optional convenience and was not executed in this Linux portfolio validation. No signed APK or iOS build is provided. Local iOS simulation requires macOS and Xcode.
