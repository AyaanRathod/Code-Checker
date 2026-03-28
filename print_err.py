with open("seed.txt", "rb") as f:
    text = f.read().decode("utf-16le", errors="ignore")
    if text.strip() == "":
        text = open("seed.txt", "rb").read().decode("utf-8", errors="ignore")
    print("---------------------------------")
    print(text[-2000:])
    print("---------------------------------")
