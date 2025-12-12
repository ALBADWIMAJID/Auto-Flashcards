# backend/Dockerfile

# Базовый образ с Python
FROM python:3.11-slim

# Отключаем создание .pyc и включаем немедленный вывод логов
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Рабочая директория внутри контейнера
WORKDIR /app

# Сначала копируем файл зависимостей и устанавливаем их
COPY backend/requirements.txt ./requirements.txt

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Теперь копируем исходный код backend и папку ml (для baseline модели)
COPY backend ./backend
COPY ml ./ml

# Открываем порт, на котором будет работать FastAPI
EXPOSE 8000

# Команда запуска приложения
# Важно: используем модуль backend.app.main:app
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
