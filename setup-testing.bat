@echo off
echo ================================================
echo  SETUP TESTING - Toko Sepatu By Sovan
echo ================================================

echo.
echo [1/3] Menghapus semua devDependencies lama...
call npm uninstall jest jest-expo @testing-library/react-native @testing-library/jest-native react-test-renderer babel-jest @babel/plugin-transform-modules-commonjs --legacy-peer-deps

echo.
echo [2/3] Install ulang (tanpa jest-expo)...
call npm install --save-dev jest@29.7.0 babel-jest@29.7.0 @testing-library/react-native@12.9.0 @testing-library/jest-native@5.4.3 react-test-renderer@18.2.0 @babel/plugin-transform-modules-commonjs@7.25.9 --legacy-peer-deps

echo.
echo [3/3] Selesai! Jalankan test dengan:
echo   npx jest --coverage
echo.
pause