#!/bin/bash
# build + validate + render to JPG for visual QA
S=/root/.claude/skills/synced/7bc084e7-2165-4172-a544-b030b1c5bd5a_1eabd9df-c4b8-40f4-ac8f-7e4b9a5781cb/pptx/scripts
R=/tmp/claude-0/-home-user-cjl-slides/b23f4272-2f76-5048-b2e2-dc6ac58f9a47/scratchpad/render
cd /home/user/cjl-slides/presentation
NODE_PATH=$PWD/node_modules node build.js || exit 1
python3 $S/office/validate.py Gaymorova_pazuha.pptx || exit 1
mkdir -p $R && cd $R && rm -rf qa && mkdir qa && cd qa && python3 -c "import zipfile;zipfile.ZipFile('/home/user/cjl-slides/presentation/Gaymorova_pazuha.pptx').extractall('x')" && grep -rl Cambria x | xargs sed -i 's/Cambria/Caladea/g' && (cd x && zip -qXr ../../Gaymorova_pazuha.pptx .) && cd .. 
python3 $S/office/soffice.py --headless --convert-to pdf Gaymorova_pazuha.pptx >/dev/null 2>&1
rm -f slide-*.jpg; rm -f Gaymorova_pazuha.pptx.bak; pdftoppm -jpeg -r ${1:-96} Gaymorova_pazuha.pdf slide; ls -1 $R/slide-*.jpg
