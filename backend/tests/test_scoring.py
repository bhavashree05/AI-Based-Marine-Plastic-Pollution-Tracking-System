import pytest
from backend.app.services.severity_engine import calculate_severity_score

def test_severity_score_critical():
    result = calculate_severity_score(
        concentration_class="Very High",
        measurement=150.0,
        marine_setting="Beach-Nurdle Patrol",
        detected_plastics_count=8,
        observation_age_years=0.5,
        repeat_count=3
    )
    assert result["severity_score"] >= 75.0
    assert result["severity_level"] == "CRITICAL"
    assert result["concentration_pts"] >= 30.0
    assert result["marine_setting_pts"] >= 20.0
    assert "Severity Score =" in result["calculation_formula"]

def test_severity_score_low():
    result = calculate_severity_score(
        concentration_class="Very Low",
        measurement=0.5,
        marine_setting="Ocean sediment",
        detected_plastics_count=0,
        observation_age_years=15.0,
        repeat_count=1
    )
    assert result["severity_score"] <= 35.0
    assert result["severity_level"] in ["LOW", "MEDIUM"]

def test_factor_breakdown_bounds():
    result = calculate_severity_score()
    assert 0.0 <= result["severity_score"] <= 100.0
    assert result["concentration_pts"] <= 40.0
    assert result["marine_setting_pts"] <= 25.0
    assert result["visual_plastic_pts"] <= 20.0
    assert result["recency_frequency_pts"] <= 15.0
