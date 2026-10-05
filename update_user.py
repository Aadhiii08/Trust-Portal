import re

file_path = 'src/app/dashboard/user/page.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Duration of stay
content = content.replace('<label style={labelStyle}>Duration of Stay</label>', '<label style={labelStyle}>Duration of Stay (in months)</label>')

# 2. Remove total income block
# Find the exact block
block = """                <div style={{ borderBottom: '1px solid #e2e8f0', gridColumn: 'span 2', margin: '0.5rem 0' }}></div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={labelStyle}>Total Family Annual Income (₹)</label>
                  <input style={inputStyle} name="totalIncome" value={formData.totalIncome} onChange={handleChange} placeholder="Total income of all family members" />
                </div>"""
if block in content:
    content = content.replace(block, "")
else:
    # Try regex if exact block not matched
    content = re.sub(r'<div style=\{\{ borderBottom: \'1px solid #e2e8f0\', gridColumn: \'span 2\', margin: \'0\.5rem 0\' \}\}></div>\s*<div style=\{\{ gridColumn: \'span 2\' \}\}>\s*<label style=\{labelStyle\}>Total Family Annual Income \(₹\)</label>\s*<input style=\{inputStyle\} name="totalIncome" value=\{formData\.totalIncome\} onChange=\{handleChange\} placeholder="Total income of all family members" />\s*</div>', '', content)

# 3. Add PARENT_PAN_CARD
pan_upload = """
                <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #10b981' }}>
                  <label style={{ ...labelStyle, color: '#047857' }}>Upload Parent's PAN Card</label>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem' }}>Supported: .png, .jpg, .jpeg, .pdf</p>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ fontSize: '0.875rem' }} />
                    <button 
                      type="button"
                      onClick={() => { setDocType('PARENT_PAN_CARD'); handleUploadSubmit(new Event('submit') as any); }}
                      style={{ padding: '0.5rem 1rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      Upload
                    </button>
                  </div>
                </div>"""

# Insert before {activeTab === 'background' && (
content = content.replace("{activeTab === 'background' && (", pan_upload + "\n\n          {activeTab === 'background' && (")

# Add PARENT_PAN_CARD to document map
doc_map_search = "{ id: 'FEE_RECEIPT', label: 'Fee Receipt', required: true },"
doc_map_replace = "{ id: 'FEE_RECEIPT', label: 'Fee Receipt', required: true },\n                    { id: 'PARENT_PAN_CARD', label: \"Parent's PAN Card\", required: true },"
content = content.replace(doc_map_search, doc_map_replace)

# 4. Mark all labels with a star.
content = re.sub(r'<label style=\{labelStyle\}>([^<]+)</label>', r'<label style={labelStyle}>\1 <span style={{ color: \'#dc2626\' }}>*</span></label>', content)
content = re.sub(r'<label style=\{\{ \.\.\.labelStyle, color: \'#047857\' \}\}>([^<]+)</label>', r'<label style={{ ...labelStyle, color: \'#047857\' }}>\1 <span style={{ color: \'#dc2626\' }}>*</span></label>', content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Success")
