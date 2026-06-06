from PIL import Image

def remove_white_background(input_path, output_path):
    try:
        # Open the image and convert to grayscale
        img = Image.open(input_path).convert("L")
        
        # Create a solid black image of the same size
        black_img = Image.new("RGBA", img.size, (0, 0, 0, 255))
        
        # Invert the grayscale image to use as alpha channel
        # White (255) becomes 0 (transparent)
        # Black (0) becomes 255 (opaque)
        from PIL import ImageOps
        alpha = ImageOps.invert(img)
        
        # Put the alpha channel into the black image
        black_img.putalpha(alpha)
        
        # Save the result
        black_img.save(output_path, "PNG")
        print(f"Successfully processed {input_path} and saved to {output_path}")
    except Exception as e:
        print(f"Error processing image: {e}")

if __name__ == "__main__":
    input_file = "/Users/pc/Desktop/The New Me 2.0/public/line_art_leaf.png"
    output_file = "/Users/pc/Desktop/The New Me 2.0/public/line_art_leaf.png"
    remove_white_background(input_file, output_file)
