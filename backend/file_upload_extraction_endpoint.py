from fastapi import FastAPI, File, UploadFile, HTTPException
import os
import shutil
import zipfile
from fastapi.testclient import TestClient
import io
import httpx

app = FastAPI()

acceptable_extensions = ('.c', '.cpp', '.java', '.zip') # a list of the acceptable files
os.makedirs("submissions", exist_ok=True) # create a directory

# Check to see if the submitted file's extension is accepted
def is_file_acceptable(filename: str):
    if filename.lower().endswith(acceptable_extensions):
        return True
    else:
        return False

# Determines what the actions are based on the file that is submitted
@app.post("/upload/")
def uploading(uploaded_file: UploadFile = File(...)):
    if is_file_acceptable(uploaded_file.filename) == False: # Return the exception if the file is not accepted
        raise HTTPException(status_code=400, detail="File type is not supported. Only .c, .cpp, .java, and .zip are allowed.")
    elif uploaded_file.filename.lower().endswith('.zip'): # If the file is a zip file, then extract the valid files
        return extract_zip_files(uploaded_file)
    elif uploaded_file.filename.lower().endswith((".c", ".cpp", ".java")): # If a file is submitted by itself, but also an acceptable file
        return single_files(uploaded_file)


# Extracts zip files and takes only the accepted files
def extract_zip_files(uploaded_file):
    # Store the zip file into the repository
    zip_file = os.path.join("submissions", uploaded_file.filename)
    
    with open(zip_file, "wb") as f:
        f.write(uploaded_file.file.read())

    # Create a separate folder to extract zip file
    name_of_folder, extension = os.path.splitext(uploaded_file.filename)
    zip_extraction = os.path.join("submissions", name_of_folder)
    os.makedirs(zip_extraction, exist_ok=True)

    try:
        with zipfile.ZipFile(zip_file, "r") as zip: # Opens the zip file in read mode
            for file_name in zip.namelist(): # Goes through all files within the zip file
                cleaner_file_name = os.path.basename(file_name) # Takes the file name
                if is_file_acceptable(cleaner_file_name): # Checks to see if the file is acceptable
                    # Read the content in the file
                    with zip.open(file_name) as content:
                        file_content = content.read()
                    
                    # Write the content into the new file
                    new_path = os.path.join(zip_extraction, cleaner_file_name)
                    with open(new_path, "wb") as f:
                        f.write(file_content)
    except:
        raise HTTPException(status_code=400, detail="Error with the zip file") # Return an error if something unexpected occurs
    finally:
        # Remove the original zip file
        if os.path.exists(zip_file):
            os.remove(zip_file)

    return "Zip file submission has been successful"
    
# Single files that are accepted should be saved as it is
def single_files(uploaded_file):
    file = os.path.join("submissions", uploaded_file.filename) # create another file to duplicate this file

    with open(file, "wb") as f:
        shutil.copyfileobj(uploaded_file.file, f) # copy the file content of the submitted file into the newly created file

    return "Submission Completed"

# -------------------- Test Cases --------------------
testing = TestClient(app)

if __name__ == "__main__":
    # Test 1: A .c file
    # Test .c file calling the URL endpoint
    response = testing.post(
        "/upload/",
        files={"uploaded_file": ("test_file.c", b"#include <stdio.h> int main(){ return 0; }")}
    )

    # Prints out the status for dealing with .c files
    print("Test 1 - Upload .c file")
    print("Status:", response.status_code)
    print("Response:", response.text)
    print()

    # Test 2: A .cpp file
    # Test .cpp file calling the URL endpoint
    response = testing.post(
        "/upload/",
        files={"uploaded_file": ("test_file.cpp", b"#include <iostream> int main(){ return 0; }")}
    )

    # Prints out the status for dealing with .cpp files
    print("Test 2 - Upload .cpp file")
    print("Status:", response.status_code)
    print("Response:", response.text)
    print()

    # Test 3: A .java file
    # Test .java file calling the URL endpoint
    response = testing.post(
        "/upload/",
        files={"uploaded_file": ("test_file.java", b"int main(){ return 0; }")}
    )

    # Prints out the status for dealing with .java files
    print("Test 3 - Upload .java file")
    print("Status:", response.status_code)
    print("Response:", response.text)
    print()


    # Test 4: An invalid file type
    # Test .py file calling the URL endpoint
    response = testing.post(
        "/upload/",
        files={"uploaded_file": ("test_file.py", b"def main(){ return 0 }")}
    )

    # Prints out the status for dealing with invalid file types
    print("Test 4 - Invalid file type")
    print("Status:", response.status_code)
    print("Response:", response.text)
    print()


    # Test 5: A Zip archive upload
    zip_archive = io.BytesIO()

    # Contains a .c file in the zip file
    with zipfile.ZipFile(zip_archive, "w") as z:
        z.writestr("main.c", "b#include <stdio.h> int main(){ return 0; }") # Create a .c file in a zip file

    # Test .zip file calling the URL endpoint
    response = testing.post(
        "/upload/",
        files={"uploaded_file": ("test.zip", zip_archive, "application/zip")}
    )

    # Prints out the status for dealing with zip files
    print("Test 5 - Upload Zip File")
    print("Status:", response.status_code)
    print("Response:", response.text)
    print()
