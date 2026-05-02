# ERP load testing

Estas pruebas usan k6 para medir carga, estres y capacidad del ERP.

## Instalar k6

Windows con Chocolatey:

```powershell
choco install k6
```

Windows con winget:

```powershell
winget install k6 --source winget
```

Verificar:

```powershell
k6 version
```

## Variables

```powershell
$env:BASE_URL="http://localhost:3000"
$env:TENANT_SLUG="speeddan-demo"
$env:ERP_EMAIL="admin@speeddan.com"
$env:ERP_PASSWORD="Admin@2026!"
```

Para probar una URL publicada, cambia `BASE_URL`, por ejemplo:

```powershell
$env:BASE_URL="https://speeddan-barberia.vercel.app"
```

## Perfiles

Smoke test: confirma que los endpoints basicos responden.

```powershell
npm run load:smoke
```

Load test: sube gradualmente hasta 250 usuarios virtuales.

```powershell
npm run load:test
```

Stress test: sube gradualmente hasta 1000 usuarios virtuales.

```powershell
npm run load:stress
```

## Runner sin k6

Si todavia no tienes k6 instalado, puedes empezar con el runner de Node:

```powershell
npm run load:node:smoke
```

Para cambiar el perfil en PowerShell:

```powershell
$env:PROFILE="load"
npm run load:node:test
```

```powershell
$env:PROFILE="stress"
npm run load:node:stress
```

## Escrituras

Por defecto la prueba no crea citas. Para activar creacion de reservas publicas:

```powershell
$env:WRITE_BOOKING="true"
npm run load:smoke
```

Usalo solo contra una base de prueba, porque genera citas y usuarios de prueba.

## Que mirar

`http_req_failed`: porcentaje de requests fallidos.

`http_req_duration p(95)`: tiempo de respuesta para el 95% de las requests.

`checks`: validaciones por endpoint.

Un buen primer objetivo para el ERP es mantener `http_req_failed` debajo de 3% y `p(95)` debajo de 2 segundos durante el perfil `load`.
