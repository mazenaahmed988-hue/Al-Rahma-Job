@echo off
chcp 65001 >nul
title إعداد الأمان — منظومة الرحمة المهداة للتوظيف
cd /d "%~dp0"

echo.
echo ==========================================================
echo   منظومة الرحمة المهداة للتوظيف — إعداد الأمان
echo ==========================================================
echo.
echo  السكربت ده هيطلب منك صلاحيات Administrator
echo  عشان يثبت شهادة البرنامج في ويندوز.
echo.
echo  اضغط أي زر عشان نبدأ...
echo.
pause >nul

REM بنشغّل PowerShell كـ RunAs عشان يطلع رسالة UAC للمستخدم
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File','%~dp0إعداد_الأمان.ps1'"

echo.
echo  لو ظهرتلك رسالة من ويندوز (User Account Control)
echo  اضغط "Yes" أو "نعم" عشان تكمل.
echo.
timeout /t 8 >nul
exit /b 0