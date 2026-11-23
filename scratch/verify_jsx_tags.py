import re

with open('src/screens/CajaHoyScreen.tsx') as f:
    text = f.read()

# Remove comments and strings
# Self-closing tags: <tag ... />
# Open tags: <tag ...>
# Close tags: </tag>

# Strip comments
text = re.sub(r'/\*.*?\*/', '', text, flags=re.DOTALL)
text = re.sub(r'//.*', '', text)

# Find all JSX tags
# Match <Tag or </Tag or <Tag ... />
tokens = re.findall(r'<(/?[A-Za-z0-9_]+)([^>]*?)(/?)>', text)

self_closing_html = {'input', 'img', 'br', 'hr', 'meta', 'link'}
stack = []

for tag, attrs, self_close in tokens:
    if self_close == '/' or tag in self_closing_html:
        continue
    elif tag.startswith('/'):
        clean_tag = tag[1:]
        if not stack:
            print(f"ERROR: Unexpected close tag </{clean_tag}> with empty stack")
        else:
            last = stack.pop()
            if last != clean_tag:
                print(f"ERROR: Mismatched tag! Expected </{last}>, found </{clean_tag}>")
    else:
        stack.append(tag)

if stack:
    print(f"ERROR: Unclosed tags remaining in stack ({len(stack)}):", stack[-10:])
else:
    print("✓ ALL JSX TAGS PERFECTLY MATCHED AND CLOSED!")

