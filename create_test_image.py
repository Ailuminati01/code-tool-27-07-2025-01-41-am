from PIL import Image, ImageDraw, ImageFont
import os

# Create a test document image
width, height = 800, 600
img = Image.new('RGB', (width, height), color='white')
draw = ImageDraw.Draw(img)

# Try to use a default font, fallback to basic if not available
try:
    font_title = ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf", 24)
    font_text = ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf", 16)
except:
    font_title = ImageFont.load_default()
    font_text = ImageFont.load_default()

# Header
draw.rectangle([0, 0, width, 80], fill='#1e3a8a')
draw.text((20, 20), "ANDHRA PRADESH POLICE DEPARTMENT", fill='white', font=font_title)
draw.text((20, 50), "Official Document Sample", fill='white', font=font_text)

# Content
y_pos = 120
draw.text((50, y_pos), "LEAVE APPLICATION", fill='black', font=font_title)
y_pos += 50

content = [
    "Officer Name: P. Ramesh Kumar",
    "Badge Number: AP-2024-001", 
    "Station: Vijayawada Central",
    "Leave Type: Medical Leave",
    "From Date: 2024-01-15",
    "To Date: 2024-01-20",
    "Reason: Medical treatment for back injury",
    "Contact Number: +91-9876543210"
]

for line in content:
    draw.text((50, y_pos), line, fill='black', font=font_text)
    y_pos += 30

# Stamp
draw.rectangle([width-150, height-120, width-20, height-50], outline='red', width=3)
draw.text((width-140, height-110), "OFFICIAL STAMP", fill='red', font=font_text)
draw.text((width-140, height-90), "AP Police Dept.", fill='red', font=font_text)

# Signature area
draw.text((50, height-50), "Signature: ________________", fill='black', font=font_text)
draw.text((50, height-25), "Date: 2024-01-10", fill='black', font=font_text)

# Save the image
img.save('test_document.png')
print("Test document image created: test_document.png")
