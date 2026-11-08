FROM python:3.12-slim
WORKDIR /app
COPY requirements-v3.2.txt ./
RUN pip install --no-cache-dir -r requirements-v3.2.txt
COPY . ./
RUN mkdir -p /data
ENV PORT=8080 LIFEOS_DB=/data/lifeos.sqlite3
EXPOSE 8080
CMD ["python", "server.py"]
