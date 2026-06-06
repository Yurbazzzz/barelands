# Barelands - Webpack Project

Проект сайта на Webpack с предустановленным SCSS компилятором и live сервером.

## 📋 Структура проекта

```
barelands/
├── src/
│   ├── index.html          # Главный HTML файл
│   ├── index.js            # Входная точка JavaScript
│   ├── styles/
│   │   └── main.scss       # Основные стили SCSS
│   ├── images/             # Папка для изображений
│   └── fonts/              # Папка для шрифтов
├── dist/                   # Сборка (генерируется автоматически)
├── webpack.config.js       # Конфигурация Webpack
├── package.json            # Зависимости проекта
└── .gitignore             # Игнорируемые файлы Git
```

## 🚀 Быстрый старт

### 1. Установка зависимостей
```bash
npm install
```

### 2. Запуск dev сервера (с hot reload)
```bash
npm run dev
```
Сервер запустится на `http://localhost:3000` и автоматически откроется в браузере.

### 3. Сборка для продакшена
```bash
npm run build
```

### 4. Режим watch (отслеживание изменений)
```bash
npm run watch
```

## 📦 Установленные пакеты

### Основные:
- **webpack** - модульный бандлер
- **webpack-cli** - CLI для Webpack
- **webpack-dev-server** - dev сервер с hot reload

### Лоадеры:
- **babel-loader** - для трансформации JavaScript
- **sass-loader** - для компиляции SCSS
- **css-loader** - для обработки CSS
- **style-loader** - для внедрения стилей в DOM
- **file-loader** - для обработки файлов (изображения, шрифты)
- **mini-css-extract-plugin** - для извлечения CSS в отдельные файлы

### Плагины:
- **html-webpack-plugin** - для генерации HTML
- **@babel/core** - ядро Babel
- **@babel/preset-env** - пресет для современного JavaScript

## ✨ Возможности

✅ Hot Module Replacement (HMR) - автоматическое обновление при изменении кода
✅ SCSS компилятор - полная поддержка препроцессора
✅ Babel трансформация - поддержка современного JavaScript
✅ Оптимизация для продакшена - минификация и хеширование файлов
✅ Source maps - для удобной отладки в dev режиме
✅ Обработка изображений и шрифтов

## 🛠️ Дополнительные команды

```bash
# Для удаления папки node_modules и переустановки
npm install

# Просмотр версии webpack
webpack --version
```

## 💡 Советы разработки

- Все исходные файлы находятся в папке `src/`
- Стили храните в `src/styles/main.scss`
- Изображения добавляйте в `src/images/`
- Шрифты размещайте в `src/fonts/`
- Во время разработки используйте `npm run dev` для автоматического обновления

## 📝 Лицензия

ISC
