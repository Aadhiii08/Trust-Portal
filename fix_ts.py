import re

file_path = 'src/app/dashboard/user/page.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix handleUploadSubmit calls
content = re.sub(r"setDocType\('([^']+)'\);\s*handleUploadSubmit\(new Event\('submit'\) as any\);", r"handleUploadSubmit('\1', file);", content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed handleUploadSubmit")
