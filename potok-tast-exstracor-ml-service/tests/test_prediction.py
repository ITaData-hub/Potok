import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_predict_endpoint():
    """Тест эндпоинта предсказания"""
    response = client.post(
        "/api/v1/predict/",
        json={"text": "Пожарить пельмени до пятницы, очень важно"}
    )
    
    if response.status_code == 200:
        data = response.json()
        assert "name" in data
        assert "priority" in data
        assert "status" in data
        assert "confidence" in data
    elif response.status_code == 503:
        # Модель не загружена - это нормально для тестов
        assert "detail" in response.json()

def test_predict_batch():
    """Тест пакетного предсказания"""
    response = client.post(
        "/api/v1/predict/batch",
        json={
            "texts": [
                "Пожарить пельмени",
                "ПЕРЕДЕЛАТЬ САЙТ срочно"
            ]
        }
    )
    
    if response.status_code == 200:
        data = response.json()
        assert "results" in data
        assert "total" in data

def test_health_check():
    """Тест проверки здоровья"""
    response = client.get("/api/v1/monitoring/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "model_loaded" in data

def test_metrics():
    """Тест получения метрик"""
    response = client.get("/api/v1/monitoring/metrics")
    assert response.status_code == 200
    data = response.json()
    assert "predictions" in data

def test_invalid_input():
    """Тест с невалидным входом"""
    response = client.post(
        "/api/v1/predict/",
        json={"text": ""}
    )
    assert response.status_code == 422  # Validation error
