const vol = [1, 1450, 4675, 7411, 11530, 14415, 17575, 22678, 28108, 32804, 38700, 42210, 48903];
const gwiki = false;
const PER = 200;

$(function() {
    //$.ajaxSetup({ cache: false });
    const DKWUCS = function() {
        // テーブルを返す { (dkw): [{t:"ipa|jmj|kdb|prv",c:"utf"}] }
        this.table = {};

        this.setraw = (dkw, tbl) => {
            this.table[dkw] = tbl;
        };

        this.get = (dkw) => this.table[dkw] || [];

        this.getall = (dkw) => {
            let objs = this.table[dkw];
            if (!objs) return [];
            let c = Array.from(objs.find(obj => obj.c != "-").c)[0];
            if (!objs.some(v => v.t == "ipa")) objs.push({c:c, t:"ipa"});
            if (!objs.some(v => v.t == "kdb")) objs.push({c:c, t:"kdb"});
            const prio ={"jmj":1, "ipa":2, "kdb":3, "prv":4 };
            return objs.sort((a, b) => (prio[a.t] - prio[b.t]));
        };

        this.getv = (n, dash) => {
            if (!dash) dash = 0;
            let key = ("0000" + n).slice(-5) + "d".repeat(dash);
            if (dash == "h") key = "h" + key.slice(1);
            return this.table[key];
        };
        this.concat = (dkw) => {
            let obj = this.table[dkw];
            if (!obj) return [];
            return (obj.jmj || []).concat(obj.kdb || []).concat(obj.prv || []);
        };

        // 重複なく配列を返す
        this.array = (dkw) => {
            let ret = this.table[dkw] || [];
            return ret.filter((v, i, self) => v.c.match(/\uDB40[\uDD00-\uDdeF]/) || v.c[0] == "=" || i == self.findIndex(v0 => v.c == Array.from(v0.c)[0]));
        };
        this.keys = () => Object.keys(this.table);
    };

    let dkwucs = new DKWUCS();

    // テーブル描画する
    const redraw = (str) => {
        let is_hokan = false;
        if (!str) str = "";

        $("#listmenu a").removeClass("selected");

        if (str.indexOf("q=") != -1) {
            return listmenu(str.split("q=").pop());
        }
        
        if (str.indexOf("h") != -1) {
            is_hokan = true;
            str = str.split("h").join("");
        }
        
        let val = parseInt(str, 10);
        $("#pager a").each(function() {
            let aval = $(this).text();
            let hval = val.toString(10) + (is_hokan ? "h" : "");
            if (aval == hval) $(this).addClass("selected");
        });
        let st = val * 100 + 1;
        
        if (!st) st = 1;

        $("#list .content").hide();
        $("#cjktable").text("").show();

        for (let i = 0; i < PER / 20; i++) {
            let $tr = $("<tr>").appendTo("#cjktable");
            for (let j = 0; j < 20; j++) {
                let $td = $("<td>").appendTo($tr);
            }
        }
        $("#cjktable td").each(function(idx) {
            let $td = $(this);

            const set_td = (dash) => {
                let code = ("00000" + (st + idx).toString(10)).substr(-5) + "d".repeat(dash);
                if (is_hokan) code = "h" + code.slice(1);
                
                if (dash != 0) {
                    if (!dkwucs.table[code]) return;
                    $td = $("<td>").insertAfter($td);
                }
                show_cell(code, $td);
            };
            
            set_td(0);
            set_td(1);
            set_td(2);
        });

        set_cell_clickevents();
    };

    // セルのクリックイベントを付加する
    const set_cell_clickevents = () => {
        $(".cell").unbind().click(function() {
            // 他表現のUCS表示
            let $rem = $(this).find(".ucs.other");
            if ($rem.length && $rem.is(":visible")) {
                return;
            }
            $(".ucs.other").hide();
            $rem.show();

            // Glyphwikiへのリンク
            $("#ucs").text("");
            let code = $(this).find(".d5").text();
            let dkw = $(this).find(".c").text();
            let url = "//glyphwiki.org/wiki/dkw-" + code;
            $("<a>").attr({"href": url, target:"_blank"}).text(dkw).appendTo("#ucs");

            // UCSコードの表示
            const show_ucs = (c) => {
                if (c == "-" || c == "〓") return "-";
                if (c[0] == "=") return "=" + dkwformat(c.slice(1).split(":").shift());
                if (c[0] == "#")
                    return "(" + Array.from(c.slice(1)).map(c => "U+" + c.codePointAt(0).toString(16).toUpperCase()).join(" ") + ")";
                return Array.from(c).map(c => "U+" + c.codePointAt(0).toString(16).toUpperCase()).join(" ");
            };
            let str = dkwucs.getall(code).map(obj => "<span class=" + obj.t + ">" + show_ucs(obj.c) + "</span>").join("");
            $("#ucs").append(": " + str).show();
            console.log("events for", dkw);

        });
    };

    // セルを描画する
    //[td.cell [span.h:(char)][span.c:12345][span.h:(char)]...
    const show_cell = (code, $td, is_exposed) => {
        const array = dkwucs.array(code);

        $td.addClass("cell");
        let $h = $("<span>").addClass("h").appendTo($td);
        let $c = $("<span>").addClass("c").text(dkwformat(code)).appendTo($td);
        $("<span>").addClass("d5").text(code).appendTo($td).hide();
        
        //欠番
        if (array.length == 0) {
            $td.css("background-color", "#aaa");
            return;
        }

        //$dom に c(utf) を表示する
        const set_char = (c, $dom) => {
            $dom.text(c).addClass("ucs");

            //UCS未定義
            if (c == "〓") {
                $dom.text("");
                $("<img>").appendTo($dom).attr("src", "//glyphwiki.org/glyph/dkw-" + code + ".svg").css("width","50px");
                $td.css("background-color", "#ffd");
                return;
            }

            //let c = $dom.text();
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
            if (c.substr(-1) === "*") {
                $dom.css("color", "red");
                $dom.text(c.slice(0, c.length - 1));
            }
        };
        
        //通常
        $h.css("width", "auto");
        array.filter(obj => obj.c != "-").forEach(obj => {
            let $dom = $("<span>").appendTo($h).addClass(obj.t).removeClass("jmj")

            //重複
            if (obj.c[0] == "=") {
                let d = obj.c.slice(1).split(":").shift();
                let arrayd = dkwucs.array(d);
                //set_char(arrayd[0].c, $dom);
                $("<span class='d ucs'>").addClass(obj.t).text("(=" + dkwformat(d) + ")").appendTo($h);
                return;
            }
            set_char(obj.c, $dom);
        });
        if (array.some(obj => obj.t == "prv")) $c.eq(0).addClass("prv");

        if ($h.find(".ucs").size() > 1 && !is_exposed) {
            $h.css({"position": "relative"});
            $c.css({"color":"blue", "text-decoration":"underline"});
            $h.find(".ucs:not(:first-child)").addClass("other").each(function(idx) {
                $(this).hide().css({'top': 55 * (idx + 1) +'px'});
            });
        }

        if (!gwiki) return;
        {
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
            return String.fromCodePoint(cjkcompat[1][code - 0x2f800]);
        }
        return false;
    };

    // xxxxx.xを整形する
    const dkwformat = (dkw) => {
        let dp = dkw.match(/^(h?)([0-9]+)(d*)$/);
        if (!dp) return "-";
        return (dp[1] ? "補" : "")
            + parseInt(dp[2], 10)
            + (dp[3].split("d").join("'"))
    };
    
    // ページャを表示する
    const pager = (start, end, $li, is_hokan) => {
        let st = parseInt(start / PER) * PER;
        for(let i = st; i < end; i += PER) {
            let p = parseInt(i / 100);
            if (is_hokan) p += "h";
            $("<a>").text(p).attr("href", "#" + p).appendTo($li);
            $li.append(" ");
        }
    };

    //リストを表示する
    const drawlist = {
        //統合(異体字セレクタ分離)
        "vs": ($list) => {
            // UCS統合テーブルの作成 {["丸"] = {dkw:[94,95], unified:true}}
            let table = dkwucs.keys().reduce((table, dkw) => {
                let code = dkwucs.array(dkw);
                if (!code) return table;
                code = code.find(v => v.c != "-").c;

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
                
                Object.keys(table).sort((a,b) => table[a].dkw[0] < table[b].dkw[0] ? -1 : 1).forEach(utf => {
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
            // UCS統合テーブルの作成 {["緻"] = ["27000","h0484"]}
            let table = dkwucs.keys().reduce((ret, dkw) => {
                let objs = dkwucs.array(dkw);
                if (!objs) return ret;
                if (objs.some(r => r.c[0] == "=")) return ret;
                let obj = objs.find(obj => obj.c != "-" && obj.c != "〓");
                if (!obj) return ret;
                
                if (!ret[obj.c]) ret[obj.c] = [];
                ret[obj.c].push(dkw);
                return ret;
            }, {});

            Object.keys(table).sort().forEach(code => {
                if (table[code].length < 2) return;

                let $group = $("<div>").appendTo($list).css("padding", "0");
                table[code].forEach(dkw => {
                    let $div = $("<div>").appendTo($group).css("border", "none");
                    show_cell(dkw, $div, false);
                });
            });
            $list.append("[" + $list.find(".c").size() + "]");
        },

        // UCS未定義
        "undefined": ($list) => {
            dkwucs.keys().sort().forEach(dkw => {
                let code = dkwucs.array(dkw);
                if (code.some(v => v.c == "〓"))
                    show_cell(dkw, $("<div>").addClass("cell").appendTo($list));
            });
            $list.append("[" + $list.find(".c").size() + "]");
        },
        // 統合3(IVS未定義)
        "undefvs": ($list) => {
            dkwucs.keys().forEach(dkw => {
                if (!dkwucs.table[dkw].p || !dkwucs.table[dkw].p.some(u => u.match(/\*$/))) return;
                show_cell(dkw, $("<div>").addClass("cell").appendTo($list));
            });
            $list.append("[" + $list.find(".c").size() + "]");
        },
        // 統合(重複)
        "duplicated": ($list) => {
            let ret = dkwucs.keys().sort().filter(dkw => {
                let code = dkwucs.get(dkw).find(v => v.t == "kdb");
                if (!code || code.c[0] != "=") return false;
                let $cell = $("<div>").appendTo($list).css("padding", "0");
                [code.c.slice(1), dkw].forEach(a => show_cell(a, $("<div>").appendTo($cell).css("border", "none")));
            });
            $list.append("[" + $list.find(".c").size() + "]");
        },
    
        // 複数通りのUCS表現
        "multiple" : ($list) => {
            let keys = dkwucs.keys().sort().filter(dkw => {
                let arr = dkwucs.array(dkw).filter(r => r.c[0] != "=" && r.c[0] != "-" && r.c[0] != "〓")
                if (arr.length < 2) return false;
                let cjk = arr.map(r => (is_cjkcompat(r.c) || r.c.replace(/\uDB40[\uDD00-\uDdeF]/g, "")));
                return cjk.some(c => (cjk[0] != c));
            });
            keys.sort().map(dkw => show_cell(dkw, $("<div>").appendTo($list), true));
            $list.append("[" + keys.length + "]");
        },

        // ダッシュ
        "dash": ($list) => {
            let keys = dkwucs.keys().filter(dkw => dkw.indexOf("d") != -1).sort();
            keys.map(dkw => show_cell(dkw, $("<div>").appendTo($list)));
            $list.append("[" + keys.length + "]");
        },

        //欠番
        "missing": ($list) => {
            for (let i = 1; i <= 49964; i++) {
                if (!dkwucs.getv(i)) {
                    show_cell(i.toString(), $("<div>").addClass("cell").appendTo($list));
                }
            }
            $list.append("[" + $list.find("span.c").size() + "]<br/>");
        },
    };
    drawlist.vs0 = drawlist.vs;
    
    const listmenu = (name) => {
        var $du = $("#listmenu a").filter(function(){ return $(this).attr("href").indexOf("q=" + name) != -1; }).eq(0);
        if ($du.hasClass("selected")) return;

        $du.addClass("selected");
        $("#list .content").hide();

        let id = "content_" + name;
        if ($("#" + id).length > 0) {
            $("#" + id).show();
            return;
        }
        drawlist[name]($("<div>").attr("id", id).addClass("content").appendTo("#list"));
        set_cell_clickevents();
    };

    // 検索
    $("#searchbar").change(function() {
        let str = $(this).val();
        if (!str) return;

        $("#searchres").text("");
        let keys = dkwucs.keys();
        
        Array.from(str).forEach(c => {
            let $group = $("<div>").appendTo("#searchres").css("padding", "0");
            keys.filter(dkw => dkwucs.array(dkw).map(r => r.c).join("").indexOf(c) != -1)
                .forEach(dkw => show_cell(dkw, $("<div>").appendTo($group).css("border", "none")));
        });
        set_cell_clickevents();
        
    });
    
    let $li = $("#pager");
    pager(1, 50000, $li);
    pager(1, 805, $li, true);
    window.addEventListener('hashchange', () => redraw(location.href.split("#").pop()));

    const loadtables = (callback) => {
        const A = {
            file: "dkwmerge.txt",
            handler: (txt) => {
                txt.split("\n").forEach((line, i) => {
                    if (!line || line[0]=="#") return;
                    let tbl = line.trim().split("\t");
                    let dkw = tbl.shift();
                    if (!dkw.match(/^(h?)([0-9]+)(d*)$/)) {
                        console.log(line); return;
                    }
                    let obj = [];
                    tbl = tbl.map(w => w.split("_").map((c,i) => {
                        if (i == 0) return (c == "x" ? "-" : c);
                        if (c == "xx") return "";
                        if (isNaN(parseInt(c, 16))) return c;
                        return String.fromCodePoint(0xe0100 + parseInt(c,16));
                    }).join(""));

                    let jmj = tbl.shift()
                    if ((tbl[0] == "" || tbl.length == 0) && jmj == "-") jmj = "〓";
                    obj.push({t:"jmj", c: jmj });

                    let ipa = tbl.shift();
                    obj.push({t:"ipa", c: ipa });

                    let kdb = tbl.shift();
                    if (kdb) {
                        let omit = "";
                        if (kdb[0] == "#") { kdb = kdb.slice(1); omit = "#"; }
                        ((kdb[0] == "=") ? kdb.split(":") : Array.from(kdb))
                            .forEach(c => {
                                if (c) obj.push({t:"kdb", c:omit + c});
                            });
                    }
                    obj.push({t:"prv", c:tbl.shift()});

                    dkwucs.setraw(dkw, obj.filter(v => v.c));
                });
            }
        };
        $.get(A.file, function(txt) {
            A.handler(txt);
            redraw(location.href.split("#")[1]);
            $("#list, #listmenu").show();
            $("#ucs").hide();
        });
    };

    return loadtables();
});

