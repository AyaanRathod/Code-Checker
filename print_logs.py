with open("backend_logs.txt", "rb") as f:
    print(f.read().decode("utf-16le", errors="ignore")[-2000:])
