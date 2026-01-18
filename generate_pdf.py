import markdown
from xhtml2pdf import pisa

def convert_md_to_pdf(source_md, output_pdf):
    # 1. Read Markdown
    with open(source_md, 'r', encoding='utf-8') as f:
        text = f.read()

    # 2. Convert to HTML
    html_text = markdown.markdown(text, extensions=['extra', 'codehilite'])
    
    # Add some basic styling
    full_html = f"""
    <html>
    <head>
    <style>
        body {{ font-family: Helvetica, sans-serif; font-size: 12px; }}
        h1 {{ color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }}
        h2 {{ color: #0066cc; margin-top: 20px; }}
        code {{ background-color: #f4f4f4; padding: 2px 5px; font-family: monospace; }}
        pre {{ background-color: #f4f4f4; padding: 10px; border: 1px solid #ddd; }}
    </style>
    </head>
    <body>
    {html_text}
    </body>
    </html>
    """

    # 3. Write PDF
    with open(output_pdf, "wb") as result_file:
        pisa_status = pisa.CreatePDF(
            full_html,                # the HTML to convert
            dest=result_file          # the file handle to recieve result
        )

    if pisa_status.err:
        print(f"Stats: Error extracting PDF: {pisa_status.err}")
    else:
        print(f"Success! PDF saved to {output_pdf}")

if __name__ == "__main__":
    convert_md_to_pdf("SDLC.md", "SmartWay_Traffic_SDLC.pdf")
