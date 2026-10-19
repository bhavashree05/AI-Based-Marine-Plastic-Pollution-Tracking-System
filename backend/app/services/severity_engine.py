from typing import Dict, Any, Optional

def calculate_severity_score(
    concentration_class: Optional[str] = None,
    measurement: Optional[float] = None,
    marine_setting: Optional[str] = None,
    detected_plastics_count: int = 0,
    observation_age_years: Optional[float] = None,
    repeat_count: int = 1
) -> Dict[str, Any]:
    """
    Transparent multi-criteria environmental severity assessment engine.
    Calculates a 0-100 severity index with complete mathematical factor attribution.
    """
    # 1. Concentration / Measurement Component (Max 40 pts)
    concentration_pts = 0.0
    c_class = str(concentration_class).strip().lower() if concentration_class else ""
    
    if "very high" in c_class:
        concentration_pts = 40.0
    elif "high" in c_class:
        concentration_pts = 30.0
    elif "medium" in c_class:
        concentration_pts = 20.0
    elif "very low" in c_class:
        concentration_pts = 5.0
    elif "low" in c_class:
        concentration_pts = 10.0
    elif measurement is not None and measurement > 0:
        # Scale based on pieces/m3
        if measurement > 1000:
            concentration_pts = 40.0
        elif measurement > 100:
            concentration_pts = 35.0
        elif measurement > 25:
            concentration_pts = 25.0
        elif measurement > 5:
            concentration_pts = 15.0
        else:
            concentration_pts = 8.0
    else:
        # Missing or unverified measurement
        concentration_pts = 10.0

    # 2. Marine Setting & Ecological Sensitivity (Max 25 pts)
    setting_pts = 0.0
    setting_str = str(marine_setting).strip().lower() if marine_setting else ""
    if "nurdle" in setting_str or "beach" in setting_str:
        # Shoreline accumulation, nurdle spill risk to shorebirds and intertidal fauna
        setting_pts = 25.0
    elif "ocean water" in setting_str or "pelagic" in setting_str:
        # Pelagic marine ingestion risk (sea turtles, marine mammals, fish)
        setting_pts = 16.0
    elif "sediment" in setting_str or "benthic" in setting_str:
        # Benthic entrapment
        setting_pts = 10.0
    else:
        setting_pts = 8.0

    # 3. Visual Plastic Density from Computer Vision (Max 20 pts)
    visual_plastic_pts = 0.0
    if detected_plastics_count >= 10:
        visual_plastic_pts = 20.0
    elif detected_plastics_count >= 5:
        visual_plastic_pts = 15.0
    elif detected_plastics_count >= 2:
        visual_plastic_pts = 10.0
    elif detected_plastics_count == 1:
        visual_plastic_pts = 5.0
    else:
        visual_plastic_pts = 0.0

    # 4. Recency & Reporting Repetition (Max 15 pts)
    recency_pts = 8.0 # Baseline
    if observation_age_years is not None:
        if observation_age_years <= 1.0:
            recency_pts += 5.0
        elif observation_age_years <= 5.0:
            recency_pts += 2.0
    else:
        recency_pts += 3.0

    if repeat_count > 1:
        recency_pts += min(4.0, (repeat_count - 1) * 1.5)
    recency_pts = min(15.0, recency_pts)

    # Total Score Calculation
    total_score = round(concentration_pts + setting_pts + visual_plastic_pts + recency_pts, 2)
    total_score = max(0.0, min(100.0, total_score))

    # Severity Level Mapping
    if total_score >= 75.0:
        severity_level = "CRITICAL"
    elif total_score >= 50.0:
        severity_level = "HIGH"
    elif total_score >= 25.0:
        severity_level = "MEDIUM"
    else:
        severity_level = "LOW"

    formula_explanation = (
        f"Severity Score = Concentration ({concentration_pts:.1f}/40) + "
        f"Marine Setting ({setting_pts:.1f}/25) + "
        f"Visual Plastic Detection ({visual_plastic_pts:.1f}/20) + "
        f"Recency & Repetition ({recency_pts:.1f}/15) = {total_score:.1f}/100"
    )

    scientific_disclaimer = (
        "Severity Assessment Transparency: The severity score is a heuristic environmental decision-support metric "
        "synthesizing concentration classes, ecological habitat sensitivity, computer vision detected debris, and temporal recency. "
        "It provides actionable operational prioritization for coastal cleanup teams and should not be cited as a direct laboratory chemical quantification."
    )

    return {
        "severity_score": total_score,
        "severity_level": severity_level,
        "concentration_pts": concentration_pts,
        "marine_setting_pts": setting_pts,
        "visual_plastic_pts": visual_plastic_pts,
        "recency_frequency_pts": recency_pts,
        "calculation_formula": formula_explanation,
        "scientific_disclaimer": scientific_disclaimer
    }
