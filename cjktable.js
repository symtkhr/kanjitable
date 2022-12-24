window.onload = () => {

    const cjkrange = [
        ["統合",       0x4e00,  0x9fff],
        ["統合拡張A",  0x3400,  0x4dbf],
        ["統合拡張B", 0x20000, 0x2a6ff],
        ["統合拡張C", 0x2a700, 0x2b734],
        ["統合拡張D", 0x2b740, 0x2b81d],
        ["統合拡張E", 0x2b820, 0x2cea1],
        ["統合拡張F", 0x2ceb0, 0x2ebef],
        ["統合拡張G", 0x30000, 0x3134f],
        ["統合拡張H", 0x31350, 0x323af],
        ["互換",       0xf900,  0xfaff],
        ["互換補助",  0x2f800, 0x2fa1d],
    ];

    const $id = e => document.getElementById(e);
    const $new = e => document.createElement(e);
    const $tag = e => [... document.getElementsByTagName(e)];
    const $q = e => [... document.querySelectorAll(e)];
    const $name = e => [... document.getElementsByName(e)];

    const redraw = (st) => {
        st = (0x100 * parseInt(st, 16)) || cjkrange[0][1];
        $id("cjktable").innerHTML = "";
        for (let i = 0; i < 16; i++) {
            let $tr = $new("tr");
            $id("cjktable").appendChild($tr);
            for (let j = 0; j < 16; j++) {
                $tr.appendChild($new("td"));
            }
        }
        $q("#cjktable td").forEach(($td, idx) => {
            let code = (st + idx);
            let $char = $new("span");
            let $code = $new("span");
            $td.appendChild($char);
            $td.appendChild($code);
            $char.innerHTML = "&#" + code + ";";
            $code.textContent = "U+" + code.toString(16);
            $code.classList.add('c');
            cjkcompatible(code, $code);
        });
        $q("#pager a.selected").forEach($a => $a.classList.remove("selected"));
        $q("#pager a").forEach($a => {
            let hash = $a.href.split("#").pop();
            if (parseInt(hash, 16) * 0x100 == st) $a.classList.add("selected");
        });
    };

    const cjkcompatible = (code, $dom) => {
        let head = 0;
        if (0xf900 <= code && code < 0xfb00) head = 0xf900;
        if (0x2f800 <= code && code < 0x2fb00) head = 0x2f800;
        if (!head) return;
        let base = cjkcompat[head < 0x10000 ? 0 : 1][code - head];
        if (!base) return;
        $dom.textContent += "\n(=" + base.toString(16) + ")";
    };

    const pager = (start, end, $div) => {
        let st = parseInt(start / 0x100) * 0x100;
        for (let i = st; i < end; i += 0x100) {
            let st = parseInt(i / 0x100).toString(16);

            let $a = $new("a");
            $a.textContent = st;
            $a.setAttribute("href", "#" + st);

            $div.innerHTML += " ";
            $div.appendChild($a);
        }
    };

    cjkrange.forEach(table => {
        let $div = $new("div");
        let $h = $new("h4");
        $h.textContent = table[0] + "(" + table[1].toString(16) + " - " + table[2].toString(16) + ")";
        $id("pager").appendChild($div);
        $div.appendChild($h);
        pager(table[1], table[2], $div);
    });

    redraw(location.hash.slice(1));
    window.addEventListener('hashchange', () => { redraw(location.hash.slice(1)); });
};
