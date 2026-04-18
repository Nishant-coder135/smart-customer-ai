import pandas as pd
import io
import os
from charset_normalizer import from_bytes

def test_ingest(file_path):
    print(f"Testing ingestion for: {file_path}")
    with open(file_path, 'rb') as f:
        content = f.read()
    
    sample = content[:20480]
    try:
        detected = from_bytes(sample).best()
        encoding = (detected.encoding if detected else 'utf-8-sig') or 'utf-8-sig'
        if encoding.lower() == 'ascii':
            encoding = 'latin-1'
        print(f"Detected: {encoding}")
    except Exception:
        encoding = 'latin-1'
    
    try:
        # Simulate stream
        stream = io.BytesIO(content)
        df = pd.read_csv(
            stream, 
            encoding=encoding, 
            low_memory=True,
            on_bad_lines='skip',
            engine='python'
        )
        print(f"Success! DF Shape: {df.shape}")
        print(df.head())
    except Exception as e:
        print(f"Failed with {encoding}: {e}")
        # Desperation fallback
        try:
            df = pd.read_csv(io.BytesIO(content), encoding='latin-1', on_bad_lines='skip')
            print("Fallback Success with latin-1!")
        except Exception as e2:
            print(f"Fallback Failed: {e2}")

if __name__ == "__main__":
    # Test with sample_retail_data.csv
    test_ingest(r"c:\Users\hp\OneDrive\Documents\New project\sample_retail_data.csv")
    
    # Try to find a file with pound sign if it exists
    # If not, let's create one
    with open("test_pound.csv", "wb") as f:
        f.write(b"ID,Amount\n1,\xa3100\n") # \xa3 is Pound symbol in Latin-1
    test_ingest("test_pound.csv")
