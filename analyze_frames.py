import os
import base64
import google.generativeai as genai
from glob import glob

genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

# Select a subset of frames to understand the animation
files = sorted(glob("/Users/pc/Desktop/The New Me 2.0/first loaded page reference/ezgif-frame-*.jpg"))
selected_files = [files[0], files[15], files[30], files[45], files[60], files[75], files[90], files[105], files[120], files[-1]]

model = genai.GenerativeModel('gemini-1.5-flash')

prompt = "These are frames from a webpage load animation. Describe the 'bounce type animation' for the hero background text, and describe the 4 illustrations the user is referring to (where they are, what they look like, and how they animate)."

contents = [prompt]
for f in selected_files:
    with open(f, "rb") as image_file:
        image_data = image_file.read()
        contents.append({
            "mime_type": "image/jpeg",
            "data": image_data
        })

try:
    response = model.generate_content(contents)
    print(response.text)
except Exception as e:
    print(f"Error: {e}")
