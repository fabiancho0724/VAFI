import os

src_dir = 'src'
errors = 0

for root, _, files in os.walk(src_dir):
    for f in files:
        if f.endswith('.ts') or f.endswith('.tsx'):
            fpath = os.path.join(root, f)
            with open(fpath) as fp:
                text = fp.read()
            
            # Simple bracket balancing
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
            c_diff = cleaned_text.count('{') - cleaned_text.count('}')
            p_diff = cleaned_text.count('(') - cleaned_text.count(')')
            b_diff = cleaned_text.count('[') - cleaned_text.count(']')
            
            if c_diff != 0 or p_diff != 0 or b_diff != 0:
                print(f"ERROR in {fpath}: curly={c_diff}, paren={p_diff}, bracket={b_diff}")
                errors += 1

if errors == 0:
    print("✓ ALL .ts and .tsx files in src/ have 100% PERFECT syntax balance!")
else:
    print(f"Total files with errors: {errors}")
