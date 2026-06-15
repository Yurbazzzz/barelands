# Barelands

## Деплой на хостинг

Для работы профиля на статическом хостинге нужно добавить серверную часть для API.

### Вариант 1: Vercel
Создайте файл `api/profile.js` в корне проекта:

```javascript
const fs = require('fs');
const path = require('path');

const profilesPath = path.join('/tmp', 'profiles.json'); // или используйте базу данных

function readProfiles() { /* как в server/api/profile.js */ }
function writeProfiles(profiles) { /* как в server/api/profile.js */ }

module.exports = async function handler(req, res) { /* как в server/api/profile.js */ }
```

### Вариант 2: Netlify Functions
Создайте файл `netlify/functions/profile.js`.

### Вариант 3: Nginx + PHP
```php
<?php
// profile.php
$method = $_SERVER['REQUEST_METHOD'];
$steamId = $_GET['steamId'] ?? null;
$file = __DIR__ . '/profiles.json';

if ($method === 'GET' && $steamId) {
    $profiles = json_decode(file_get_contents($file), true);
    echo json_encode($profiles[$steamId] ?? null);
} elseif ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    $profiles = json_decode(file_get_contents($file), true);
    $profiles[$body['steamId']] = $body;
    file_put_contents($file, json_encode($profiles));
    echo json_encode($body);
}
?>
```

## Локальный запуск
```bash
npm run dev      # запустить dev сервер
npm run server   # запустить API сервер на порту 3001
npm run build    # собрать проект
```