FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
ENV PORT=8080
EXPOSE 8080
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080", \
     "--workers", "1", "--timeout-keep-alive", "300", \
     "--ws-ping-interval", "3600", "--ws-ping-timeout", "3600"]
