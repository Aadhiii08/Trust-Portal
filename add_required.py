import re

file_path = 'src/app/dashboard/user/page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
mandatory = False

for i in range(len(lines)):
    line = lines[i]
    
    if "<span style={{ color: '#dc2626' }}>*</span>" in line and not "Upload" in line:
        mandatory = True
        new_lines.append(line)
        continue
        
    if mandatory:
        if '<input ' in line and 'type="file"' not in line and 'type="checkbox"' not in line:
            if ' required ' not in line and 'required=' not in line:
                line = line.replace('<input ', '<input required ')
            mandatory = False
        elif '<select ' in line:
            if ' required ' not in line and 'required=' not in line:
                line = line.replace('<select ', '<select required ')
            mandatory = False
        elif '<textarea ' in line:
            if ' required ' not in line and 'required=' not in line:
                line = line.replace('<textarea ', '<textarea required ')
            mandatory = False
            
    # Reset if we hit a div or something that's not the input
    if mandatory and ('</div>' in line or '<div ' in line):
        pass # allow some divs
        
    new_lines.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Added required attributes")
