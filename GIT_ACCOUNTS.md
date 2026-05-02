# Git oficial del proyecto

Este proyecto trabaja desde una sola carpeta local:

```text
C:\ProjectosDev\Bookstyles\barber-pro
```

## Repositorio oficial

```text
remote: origin
repo: https://github.com/bookstylesv/bookstyles.git
cuenta esperada para push: bookstylesv
rama oficial: main
```

No debe existir otro remoto de GitHub en este proyecto.

## Flujo normal

Antes de trabajar:

```powershell
git switch main
git pull origin main
```

Para guardar cambios:

```powershell
git status --short --branch
git add .
git commit -m "mensaje del cambio"
```

Antes de subir siempre confirmar:

```text
repo: bookstylesv/bookstyles.git
rama: main
cuenta esperada: bookstylesv
```

Subir:

```powershell
git push origin main
```

## Ver configuracion actual

```powershell
git remote -v
git status --short --branch
git config --local --list
```

## Credenciales

No guardar tokens, passwords ni credenciales dentro del repositorio.

Los tokens de GitHub deben guardarse en:

```text
Administrador de credenciales de Windows
Git Credential Manager
```

La configuracion actual separa credenciales por URL de repositorio:

```powershell
git config --global credential.https://github.com.useHttpPath true
git config --local credential.https://github.com.useHttpPath true
```

Si Git usa una cuenta equivocada, borrar la credencial guardada para este repo:

```powershell
@'
protocol=https
host=github.com
path=bookstylesv/bookstyles.git

'@ | git credential reject
```

Luego ejecutar de nuevo:

```powershell
git push origin main
```

Cuando Git Credential Manager pida login, seleccionar la cuenta `bookstylesv`.
