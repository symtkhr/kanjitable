const gwiki = false;
const PER = 10;

const KXUCS = function() {
    this.table = {}; 
    
    this.set = (pagenum, v, as) => {
        if (!pagenum || !v) return;
        let p = pagenum.split(".");//.map(v => parseInt(v));
        let page = p[0];
        let num = parseInt(p[1]);
        if (!this.table[page]) this.table[page] = [];
        this.table[page][num] = v;
    };
    
    // テーブルを返す {(page): ["utf","utf","utf"...]}
    this.get = (page) => this.table[page] || [];
    
    this.getv = (n, dash) => {
        if (!dash) dash = 0;
        //let key = ("0000" + n).slice(-5) + "." + dash;
        let key = n + "." + dash;
        if (dash == "h") key = "h" + key.slice(1);
        return this.table[key];
    };

    this.array = (page) => {
        let ret = this.table[page] || [];
        return ret;//.filter((v, i, self) => i == self.findIndex(v0 => v.c == v0.c));
    };
    this.keys = () => Object.keys(this.table);
};

let dkwucs = new KXUCS();

$(function() {
    $.ajaxSetup({ cache: false });
    $("<div>").attr("id", "kxtable").addClass("content").appendTo("#list").show();

    // テーブル描画する
    const redraw = (str) => {
        if (!str) str = "";
        
        $("#listmenu a").removeClass("selected").each(function() {
            let aval = $(this).attr("href");//text();
            let hval = "#" + str;//val.toString(10);
            if (aval == hval) $(this).addClass("selected");
        });

        let val = parseInt(str, 10);
        let st = val;
        
        $("#kxtable").show().text("");
        if (!st || st < 75) st = 70;

        let drawspecial = (name) => {
            $("#list .content").hide();
            let id = "content_" + name;
            if ($("#" + id).length > 0) {
                $("#" + id).show();
                return;
            }
            if (!drawlist[name]) return true;
            drawlist[name]($("<div>").attr("id", id).addClass("content").appendTo("#list"));
        };
        
        if (drawspecial(str)) [...Array(10)].map((x,idx) => {
            let page = ("0000" + (st + idx).toString(10)).slice(-4);
            const array = dkwucs.get("KX" + page);
            const url = `https://www.kangxizidian.com/kangxi/${page}.gif`;
            if (array.length)  $("#kxtable").show().append(`<h3><a href='${url}'>p.${page}</h3>`);
            array.map((v, idx) => {
                show_cell([v], page, idx, $("<div>").addClass("cell").appendTo("#kxtable"));
            });
        });

        set_cell_clickevents();
    };

    // セルのクリックイベントを付加する
    const set_cell_clickevents = () => {
        $(".cell").click(function() {
            // 他表現のUCS表示
            let $rem = $(this).find(".ucs.other");
            if ($rem.length && $rem.is(":visible")) return;

            $(".ucs.other").hide();
            $rem.show();

            // Glyphwikiへのリンク
            $("#ucs").text("").show();
            let code = $(this).attr("id");
            let url = "//glyphwiki.org/wiki/simch-kx_t" + code.slice(3,7) + parseInt(code.slice(-3,-1)).toString(16) + code.slice(-1);
            $("<a>").attr({"href": url, target:"_blank"}).text(code).appendTo("#ucs");
            let page = code.slice(3,7);
            let array = dkwucs.get("KX" + page);
            let c = array[code.slice(-3) * 1];
            let strucs = "u" + c.codePointAt(0).toString(16);//.toUpperCase();
            $("#ucs").append(`: <span><a href='//glyphwiki.org/wiki/${strucs}' target="_blank">${strucs}</a></span>`);
            $("#ucs").append(`(<a href='https://www.kangxizidian.com/kangxi/${page}.gif' target="_blank">gif</a>)`);
        });
    };

    // セルを描画する
    //[td.cell [span.h:(char)][span.c:12345][span.h:(char)]...
    const show_cell = (array, page, num, $td, is_exposed) => {
        let $h = $("<span>").addClass("h").appendTo($td);
        let $c = $("<span>").addClass("c").text(is_exposed ? page : num).appendTo($td);
        $td.attr("id", "kx-" + ("000" + page).slice(-4) + ("000" + num).slice(-3));
        
        //$dom に c(utf) を表示する
        const set_char = (c, $dom) => {
            $dom.text(c).addClass("ucs");
            
            //UCS未定義
            if (c == "〓") {
                $dom.text("");
                let dp = $c.text().match(/^(補?)([0-9]+)('*)/);
                let code = ("0000" + (dp[2]).toString(10)).slice(-5) + "d".repeat(dp[3].length);
                $("<img>").appendTo($dom).attr("src", "//glyphwiki.org/glyph/simch-kx_" + code + ".svg").css("width","50px");
                $td.css("background-color", "#ffd");
                return;
            }

            if (is_cjkcompat(c)) {
                $dom.css("color", "blue");
                return;
            }
            // IVS
            if (c.match(/\uDB40[\uDD00-\uDdeF]/)) {
                $dom.css("color", "#080");
                return;
            }
            // Undefined IVS
            if (c.slice(-1) === "*") {
                $dom.css("color", "red").text(c.slice(0, c.length - 1));
                return;
            }
            if (1 < Array.from(c).length) {
                $dom.text("");
                $("<img>").appendTo($dom).attr("src", "//glyphwiki.org/glyph/" + code + ".svg").css("width","50px");
                $td.css("background-color", "#ffd");
                return;
            }
        };
        
        //通常
        $h.css("width", "auto");

        array.forEach(c => set_char(c, $("<span>").appendTo($h)));

        if (1 < $h.find(".ucs").size() && !is_exposed) {
            $h.css({"position": "relative"});
            $c.css({"color":"blue", "text-decoration":"underline"});
            $h.find(".ucs:not(:first-child)").addClass("other").each(function(idx) {
                $(this).hide().css({'top': 55 * (idx + 1) +'px'});
            });
        }

        if (!gwiki) return;
        {
            let dp = code.match(/^(h?)([0-9]+)\.([0-2])/);
            if (!dp) return;
            var code = ("0000" + (dp[2]).toString(10)).substr(-5) + "d".repeat(dp[3]);
            if (dp[1]) code = "h" + code.slice(1);
            
            $("<img>").attr("src", "//glyphwiki.org/glyph/dkw-" + code + ".svg")
                .css({"width":"50px", "height":"50px", "background-color":"#ffc"}).appendTo($h);
            $h.css("height", "auto");
        }
    };

    // CJK互換を統合漢字に変換する; otherwise false
    const is_cjkcompat = (c) => {
        if (c.match(/^[\uF900-\uFAFF]/)) {
            let offset = c.charCodeAt(0) - 0xf900;
            if (offset < 0) return false;
            let uni = cjkcompat[0][offset];
            if (!uni) return false;
            return String.fromCodePoint(uni) || false;
        }
        if (c.match(/^[\uD800-\uDBFF][\uDC00-\uDFFF]/)) {
            c = c.substr(0, 2);
            let code = (c.charCodeAt(0) & 0x3ff) << 10 | (c.charCodeAt(1) & 0x3ff);
            code += 0x10000;
            if (code < 0x2f800 || 0x2fb00 <= code) return false;
            return false;
            return String.fromCodePoint(cjkcompat[1][code - 0x2f800]);
        }
        return false;
    };

    // ページャを表示する
    const pager = (start, end, $li) => {
        let st = parseInt(start / PER) * PER;
        for(let i = st; i < end; i += PER) {
            let p = parseInt(i);
            $("<a>").text(p).attr("href", "#" + p).appendTo($li);
            $li.append(p == 1530 || p == 1570 ? " / " : " ");
        }
    };

    //リストを表示する
    const drawlist = {
        //統合(異体字セレクタ分離)
        "vs": ($list) => {
            // UCS統合テーブルの作成 {["丸"] = {dkw:[94,95], unified:true}}
            let table = dkwucs.keys().reduce((table, dkw) => {
                let code = dkwucs.get(dkw);
                if (!code) return table;
                code = code[0].c;

                // 統合漢字表現に統一する
                let utf = is_cjkcompat(code) || code.replace(/\uDB40[\uDD00-\uDdeF]/g, "");

                if (!table[utf]) table[utf] = {dkw:[]};
                if (utf != code) table[utf].unified = true;
                table[utf].dkw.push(dkw);
                return table;
            }, {});

            // 結果表示
            ["vs", "vs0"].forEach((name) => {
                if (name == "vs0") return;
                let id = "content_" + name;
                let $list = $("#" + id);
                if ($list.length == 0)
                    $list = $("<div>").attr("id", id).addClass("content").appendTo("#list").hide();
                
                Object.keys(table).forEach(utf => {
                    if (!table[utf].unified) return;
                    let dkws = table[utf].dkw;
                    if (name == "vs" && dkws.length == 1) return;
                    if (name == "vs0" && dkws.length != 1) return;
                    let $group = $("<div>").appendTo($list).css("padding", "0");
                    dkws.forEach(dkw => {
                        let $div = $("<div>").appendTo($group).css("border", "none");

                        show_cell(dkw, $div, false);
                    });
                });
                $list.append("[" + $list.find("span.c").size() + "]<br/>");
            });
            $list.show();
        },

        //統合(同一符号化)
        "unified": ($list) => {
            let table = dkwucs.keys().reduce((table, kx) => {
                let cs = dkwucs.get(kx);
                (cs || []).map(c => {
                    if (!table[c]) table[c] = [];
                    table[c].push(kx);
                });
                return table;
            }, {});

            Object.keys(table).sort().forEach(code => {
                if (table[code].length < 2) return;
                let $group = $("<div>").appendTo($list).css("padding", "0");//.addClass("cell");
                table[code].forEach(kx => {
                    let $div = $("<div>").appendTo($group).css("border", "none").addClass("cell");
                    show_cell([code], kx, dkwucs.get(kx).indexOf(code), $div, true);
                });
            });
            $list.append("[" + $list.find(".c").size() + "]");
        },

        // UCS未定義
        "undefined": ($list) => {
            dkwucs.keys().forEach(dkw => {
                let code = dkwucs.get(dkw);
                if (code[0].c == "〓") 
                    show_cell([code], dkw, $("<div>").addClass("cell").appendTo($list));
            });
            $list.append("[" + $list.find(".c").size() + "]");
        },
        // 統合3(IVS未定義)
        "undefvs": ($list) => {
            dkwucs.keys().forEach(dkw => {
                if (!dkwucs.table[dkw].p || !dkwucs.table[dkw].p.some(u => u.match(/\*$/))) return;
                show_cell([], dkw, $("<div>").addClass("cell").appendTo($list));
            });
            $list.append("[" + $list.find(".c").size() + "]");
        },
        // 統合(重複)
        "duplicated": ($list) => {
            let ret = dkwucs.keys().filter(dkw => {
                let code = dkwucs.get(dkw).find(v => v.t == "k");
                if (!code || code.c[0] != "=") return false;
                let $cell = $("<div>").appendTo($list).css("padding", "0");
                [code.c.slice(1), dkw].forEach(a => show_cell([], a, $("<div>").appendTo($cell).css("border", "none")));
            });
            $list.append("[" + $list.find(".c").size() + "]");
        },
    
        // 複数通りのUCS表現
        "multiple" : ($list) => {
            let keys = dkwucs.keys().filter(dkw => {
                let arr = dkwucs.get(dkw);
                if (arr.length < 2) return false;
                let cjk = arr.filter(r => r.c[0] != "=").map(r => (is_cjkcompat(r.c) || r.c.replace(/\uDB40[\uDD00-\uDdeF]/g, "")));
                return cjk.some(c => (cjk[0] != c));
            });
            keys.map(dkw => show_cell([], dkw, $("<div>").appendTo($list), true));
            $list.append("[" + keys.length + "]");
        },

        // ダッシュ
        "dash": ($list) => {
            let keys = dkwucs.keys().filter(dkw => (0 != parseInt(dkw.split(".").pop())))
                .sort((a,b) => parseInt(a) - parseInt(b));
            keys.map(dkw => show_cell([], dkw, $("<div>").appendTo($list)));
            $list.append("[" + keys.length + "]");
        },

        //欠番
        "missing": ($list) => {
            for (let i = 1; i <= 49964; i++) {
                if (!dkwucs.getv(i)) {
                    show_cell([], i + ".0", $("<div>").addClass("cell").appendTo($list));
                }
            }
            $list.append("[" + $list.find("span.c").size() + "]<br/>");
        },
    };
    drawlist.vs0 = drawlist.vs;

    // 検索
    $("#searchbar").change(function() {
        let str = $(this).val();
        if (!str) return;

        $("#searchres").text("");
        let keys = dkwucs.keys();
        
        Array.from(str).forEach(c => {
            let $group = $("<div>").appendTo("#searchres").css("padding", "0");
            keys.filter(dkw => dkwucs.get(dkw).join("").indexOf(c) != -1)
                .forEach(dkw => show_cell([c], dkw, dkwucs.get(dkw).findIndex(t => t && t.indexOf(c) == 0),
                                          $("<div>").appendTo($group).addClass("cell").css("border", "none"), true));
        });
        //let $group = $("<div>").appendTo($list).css("padding", "0").addClass("cell");
        set_cell_clickevents();
    });
    
    const loadtables = (callback) => {

        const filehandlers = [{
            file: "kx2ucs.txt",
            handler: (txt) => {
                txt += ["","KX1546.019\t𠔂","KX0711.011\t𤞲", "KX0714.019\t𪻅"].join("\n"); // updated
                txt.split("\n").forEach((line, i) => {
                    if (!line || line[0]=="#") return;
                    let tbl = line.trim().split("\t");
                    let m = tbl.shift().match(/^KX[0-9.]+$/);
                    if (!m) { console.log(line); return; }
                    let kx = m[0];
                    let utf = tbl.shift();
                    if (1 < Array.from(utf).length && utf.slice(-1)!="*") console.log(kx, utf);
                    dkwucs.set(kx, utf);
                });
            },
        }];

        const loadfile = (i) => {
            if (filehandlers.length <= i) return callback();
            let v = filehandlers[i];
            $.get(v.file, function(txt) {
                v.handler(txt);
                loadfile(i + 1);
            });
        };
        
        loadfile(0);
        
    };

    pager(75, 1631, $("#pager"));
    window.addEventListener('hashchange', () => { redraw(location.hash.slice(1)); });
    return loadtables(() => {
        redraw(location.hash.slice(1));
        $("#list, #listmenu").show();
        $("#ucs").hide();
    });
});

