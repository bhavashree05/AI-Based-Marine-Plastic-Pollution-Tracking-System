import pytest
import pandas as pd
from pathlib import Path
from backend.app.services.data_processor import inspect_dataset_file, clean_and_process_dataset

def test_data_inspection(tmp_path):
    # Create sample CSV with known issues
    test_csv = tmp_path / "sample_marine.csv"
    data = {
        "Latitude": [25.0, 95.0, -45.0, 25.0], # 95.0 is invalid coordinate, 4th is duplicate
        "Longitude": [-80.0, 190.0, 50.0, -80.0],
        "Ocean": ["Atlantic Ocean", "Pacific Ocean", "Indian Ocean", "Atlantic Ocean"],
        "EmptyCol": [None, None, None, None]
    }
    df = pd.DataFrame(data)
    df.to_csv(test_csv, index=False)

    report = inspect_dataset_file(test_csv)
    assert report["total_rows"] == 4
    assert report["empty_columns"] == ["EmptyCol"]
    assert report["duplicate_rows"] == 1
    assert report["valid_coordinates_count"] == 3
    assert report["invalid_coordinates_count"] == 1

def test_data_cleaning(tmp_path):
    test_csv = tmp_path / "sample_marine_cleaning.csv"
    data = {
        "Latitude": [25.0, 95.0, -45.0, 25.0],
        "Longitude": [-80.0, 190.0, 50.0, -80.0],
        "Ocean": ["Atlantic", "Pacific", "Indian", "Atlantic"],
        "EmptyCol": [None, None, None, None]
    }
    pd.DataFrame(data).to_csv(test_csv, index=False)

    cleaned = clean_and_process_dataset(test_csv, output_filename="test_cleaned.csv")
    assert "EmptyCol" in cleaned["dropped_empty_columns"]
    assert cleaned["dropped_duplicate_rows"] == 1
    assert cleaned["dropped_invalid_coords"] == 1

def test_empty_csv_error(tmp_path):
    empty_csv = tmp_path / "empty.csv"
    empty_csv.write_text("")
    with pytest.raises(ValueError):
        inspect_dataset_file(empty_csv)

def test_zero_zero_coordinate_flagging(tmp_path):
    test_csv = tmp_path / "zero_zero_test.csv"
    data = {
        "Latitude": [20.0, 0.0, -15.0],
        "Longitude": [-40.0, 0.0, 60.0],
        "Ocean": ["Atlantic", "Artificial Null Island", "Indian"]
    }
    pd.DataFrame(data).to_csv(test_csv, index=False)
    report = inspect_dataset_file(test_csv)
    assert report["zero_zero_coordinates_count"] == 1
    assert report["valid_coordinates_count"] == 2
    assert report["invalid_coordinates_count"] == 1

