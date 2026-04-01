@echo off
setlocal enabledelayedexpansion

set "root=%~dp0"
set "json=%root%Setlist.json"

echo Generating JSON at "%json%"
echo.

(
echo {
echo   "bands": [
) > "%json%"

set firstBand=true

for /d %%B in ("%root%*") do (
    set "bandName=%%~nB"
    set "bandCover=Setlist/%%~nB/%%~nB.jpg"

    if "!firstBand!"=="true" (
        set firstBand=false
    ) else (
        >> "%json%" echo ,
    )

    (
    echo     {
    echo       "name": "!bandName!",
    echo       "genre": "unknown",
    echo       "cover": "!bandCover!",
    echo       "albums": [
    ) >> "%json%"

    set firstAlbum=true

    :: Turn off delayed expansion so ! in album names is preserved
    setlocal disableDelayedExpansion
    for /d %%A in ("%%B\*") do (
        set "albumName=%%~nA"
        set "albumCover=Setlist/%%~nB/%%~nA/%%~nA.jpg"
        set "albumPath=Setlist/%%~nB/%%~nA/"

        (
          for %%T in ("%%A\*.mp3") do echo %%~nxT
          for %%T in ("%%A\*.mp4") do echo %%~nxT
          for %%T in ("%%A\*.flac") do echo %%~nxT
        ) > "%%A\setlist.txt"

        if defined firstAlbum (
            set firstAlbum=
        ) else (
            >> "%json%" echo ,
        )

        >> "%json%" echo         {
        >> "%json%" echo           "title": "%%~nA",
        >> "%json%" echo           "cover": "Setlist/%%~nB/%%~nA/%%~nA.jpg",
        >> "%json%" echo           "path": "Setlist/%%~nB/%%~nA/"
        >> "%json%" echo         }
    )
    endlocal

    (
    echo       ]
    echo     }
    ) >> "%json%"
)

(
echo   ]
echo }
) >> "%json%"

echo.
echo
pause
