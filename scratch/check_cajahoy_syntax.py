with open('src/screens/CajaHoyScreen.tsx') as f:
    text = f.read()

in_str = None
in_comment = False
cleaned = []
i = 0
n = len(text)
while i < n:
    c = text[i]
    if in_comment:
        if c == '*' and i + 1 < n and text[i+1] == '/':
            in_comment = False
            i += 2
            continue
        elif c == '\n':
            in_comment = False
        i += 1
        continue
    if in_str:
        if c == '\\':
            i += 2
            continue
        elif c == in_str:
            in_str = None
        i += 1
        continue
    if c in ['"', "'", '`']:
        in_str = c
        i += 1
        continue
    if c == '/' and i + 1 < n and text[i+1] == '/':
        in_comment = True
        i += 2
        continue
    if c == '/' and i + 1 < n and text[i+1] == '*':
        in_comment = True
        i += 2
        continue
    cleaned.append(c)
    i += 1

cleaned_text = ''.join(cleaned)
print('Code tokens only for CajaHoyScreen.tsx:')
print('Curly braces diff:', cleaned_text.count('{') - cleaned_text.count('}'))
print('Parentheses diff:', cleaned_text.count('(') - cleaned_text.count(')'))
print('Square brackets diff:', cleaned_text.count('[') - cleaned_text.count(']'))
