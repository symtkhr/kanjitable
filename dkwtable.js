const vol = [1, 1450, 4675, 7411, 11530, 14415, 17575, 22678, 28108, 32804, 38700, 42210, 48903];
const gwiki = false;
const PER = 200;

$(function() {
    
    const DKWUCS = function() {
	// テーブルを返す {(dkw): {mj:"utf", k:["utf"], p:["utf"]}}
	this.table = {}; 

	this.set = (dkw, v, as) => {
	    if (!dkw || !v) return;
	    if (!as) {
		this.table[dkw] = { mj: v };
		return;
	    }
	    if (!this.table[dkw]) this.table[dkw] = {};

	    if (typeof(v) == "object") {
		v = v.filter(e => e[0] != "#");
		if (v.length == 0) return;
	    }
	    
	    this.table[dkw][as] = v;
	};

	this.get = (dkw) => this.table[dkw];

	this.getv = (n, dash) => {
	    if (!dash) dash = 0;
	    let key = ("0000" + n).slice(-5) + "." + dash;
	    if (dash == "h") key = "h" + key.slice(1);
	    return this.table[key];
	};
	this.concat = (dkw) => {
	    let obj = this.table[dkw];
	    if (!obj) return [];
	    return (obj.mj || []).concat(obj.k || []).concat(obj.p || []);
	};

	// 配列を返す [{c:"utf",t:"p"},{c:"utf",t:"mj"},{c:"utf",t:"k"}]
	this.array = (dkw) => {
	    let ret = [];
	    let obj = this.table[dkw];
	    if (!obj) return ret;
	    if (obj.p)  obj.p.forEach(v => ret.push({c:v, t:"p"}));   
	    if (obj.mj) ret.push({c: obj.mj, t:"mj"});
	    if (obj.k)  obj.k.forEach(v => ret.push({c:v, t:"k"}));
	    
	    return ret.filter((v, i, self) => i == self.findIndex(v0 => v.c == v0.c));
	};
	this.keys = () => Object.keys(this.table).sort();
    };
    let dkwucs = new DKWUCS();
    
    $("<div>").attr("id", "content_refdiff").addClass("content").appendTo("#list")

    $.get("mj0502_pickup.txt", function(txt) {
        txt.split("\n").forEach(line => {
            if (!line) return;
            let tbl = line.trim().split("\t");
            let m = tbl.shift().match(/^(h?[0-9]+)('*)$/);
            if (!m) { console.log(line); return; }
	    let dkw = m[1] + "." + m[2].length;
	    let utf = tbl.shift().split("_")
		.map(c => String.fromCodePoint(parseInt(c, 16)))
		.join("");
            dkwucs.set(dkw, utf);
	});

	$.getJSON("dkwappend.json", function(table) {
            table.forEach(obj => {
		dkwucs.set(obj.d, obj.k, "k");
		if (!obj.p) return;

		let done = dkwucs.concat(obj.d);
		let v = obj.p.map(v => v.split("*").shift())
		    .filter(v => v && !done.includes(v))
		    .map(v => v.split("+")
			 .map(c => c.indexOf("e01") < 0 ? c : String.fromCodePoint(parseInt(c, 16)))
			 .join(""));
		dkwucs.set(obj.d, v, "p");
            });

            redraw(location.href.split("#")[1]);

	    $("#list, #listmenu").show();
	    $("#ucs").hide();

	}, function(e) {
	    console.log(e);
	});
    });

    // テーブル描画する
    const redraw = (str) => {
        let is_hokan = false;
        if (!str) str = "";
        if (str.indexOf("h") != -1) {
	    is_hokan = true;
	    str = str.split("h").join("");
	}
	
        let val = parseInt(str, 10);
	$("#listmenu span, #pager a").removeClass("selected");
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
                let code = ("0000" + (st + idx).toString(10)).substr(-5) + "." + dash;
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
        $(".cell").click(function() {
	    // 他表現のUCS表示
	    let $rem = $(this).find(".ucs.other");
            if ($rem.length && $rem.is(":visible")) {
                return;
            }
            $(".ucs.other").hide();
            $rem.show();

	    // UCSコードの表示
            let strucs = $(this).find(".h span.ucs")
		.filter(function() { return !$(this).hasClass("d"); })
		.map(function() {return $(this).text(); })
		.get()
                .map(str => Array.from(str)
		     .map(c => "U+" + c.codePointAt(0).toString(16).toUpperCase()).join(" "))
		.map(ustr => "[" + ustr + "]")
		.join("");
            $("#ucs").text(": " + strucs).show();

	    // Glyphwikiへのリンク
	    let dkw = $(this).find(".c").text();
	    let dp = dkw.match(/^(補?)([0-9]+)('*)/);
            let code = ("0000" + (dp[2]).toString(10)).substr(-5) + "d".repeat(dp[3].length);
	    if (dp[1]) code = "h" + code.slice(1);
            let url = "//glyphwiki.org/wiki/dkw-" + code;
	    $("<a>").attr({"href": url, target:"_blank"}).text(dkw).prependTo("#ucs");
        });
    };

    // セルを描画する
    //[td.cell [span.h:(char)][span.c:12345][span.h:(char)]...
    const show_cell = (code, $td, is_exposed) => {
	const array = dkwucs.array(code);

        $td.addClass("cell");
        let $h = $("<span>").addClass("h").appendTo($td);
        let $c = $("<span>").addClass("c").text(dkwformat(code)).appendTo($td);
	
        //欠番
        if (array.length == 0) {
            $td.css("background-color", "#aaa");
            return;
        }

        //UCS未定義
        if (array[0].c == "〓") { 
            let dp = code.split(".");
            let imgname = "dkw-" + dp[0].toLowerCase() + "d".repeat(dp[1] * 1);
            $("<img>").appendTo($h).attr("src", "//glyphwiki.org/glyph/" + imgname + ".svg").css("width","50px");
            $td.css("background-color", "#ffd");
            return;
        }
	
	//$dom に c(utf) を表示する
        const set_char = (c, $dom) => {
	    $dom.text(c).addClass("ucs");

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

	array.forEach(obj => {
	    const bgcolor = {"mj": '#f7f7f7', "p":"#bee", "k":"#cdc"};
	    let $dom = $("<span>").css("background-color", bgcolor[obj.t]).appendTo($h);
	    //重複
            if (obj.c[0] == "=") {
		let d = obj.c.slice(1);
		let arrayd = dkwucs.array(d);
		set_char(arrayd[0].c, $dom);
		$("<span class='d ucs'>").text("(=" + dkwformat(d) + ")").appendTo($h);
		return;
	    }
            set_char(obj.c, $dom);
	});

        if ($h.find(".ucs").size() > 1 && !is_exposed) {
            $h.css({"position": "relative"});
	    $c.css({"color":"blue", "text-decoration":"underline"});
	    $h.find(".ucs:not(:first-child)").addClass("other").each(function(idx) {
		$(this).hide().css({'top': 55 * (idx + 1) +'px'});
	    });
	}
	

        if (!gwiki) return;
        let m = code.match(/^(h?[0-9]+)\.([0-2])/);
	if (!m) return;

	$("<img>").attr("src", "//glyphwiki.org/glyph/dkw-" + m[1].toLowerCase() +
			"d".repeat(m[2]) + ".svg")
            .css({"width":"50px", "height":"50px", "background-color":"#ffc"}).appendTo($h);
        $h.css("height", "auto");
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

    const stringFromCodePoint = (codeNum) => {
        let cp = codeNum - 0x10000;
        let high = 0xD800 | (cp >> 10);
        let low = 0xDC00 | (cp & 0x3FF);
        return String.fromCharCode(high, low);
    };


    // xxxxx.xを整形する
    const dkwformat = (dkw) => {
        let dp = dkw.split(".");
        let is_hokan = (dp[0][0] == "h");
        return (is_hokan ? "補" : "")
            + parseInt(is_hokan ? dp[0].slice(1) : dp[0], 10)
            + ("'".repeat(dp[1] * 1));
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
        $("#pager a").click(function() {
            let str = $(this).attr("href").split("#").pop();
            redraw(str);
        });
    };

    //リストを表示する
    const drawlist = {
        //統合(異体字セレクタ分離)
        "vs": ($list) => {
            // UCS統合テーブルの作成 {["丸"] = {dkw:[94,95], unified:true}}
            let table = dkwucs.keys().reduce((table, dkw) => {
                let code = dkwucs.get(dkw).mj;
                if (!code) return table;

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
	    // UCS統合テーブルの作成 {["緻"] = ["27000","h0484"]}
            let table = dkwucs.keys().reduce((ret, dkw) => {
                let code = (obj => {
		    if (obj.p && obj.p[0] != "〓") return obj.p[0];
		    if (obj.k && obj.k[0][0] == "=") return false;
		    if (obj.mj) return obj.mj;
		    return obj.k && obj.k[0];
		})(dkwucs.get(dkw));

                if (!code) return ret;
                if (!ret[code]) ret[code] = [];
                ret[code].push(dkw);
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
            dkwucs.keys().forEach(dkw => {
                let code = dkwucs.get(dkw).p;
                if (code && code == "〓") 
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
            dkwucs.keys().forEach(dkw => {
                let code = dkwucs.get(dkw).k;
                if (!code || code[0].indexOf("=") != 0) return;
                let $cell = $("<div>").appendTo($list).css("padding", "0");
                show_cell(code[0].slice(1), $("<div>").appendTo($cell).css("border", "none"));
		show_cell(dkw, $("<div>").appendTo($cell).css("border", "none"));
            });
            $list.append("[" + $list.find("span.c").size() + "]");
        },
    
        // 複数通りのUCS表現
        "multiple" : ($list) => {
            dkwucs.keys().forEach(dkw => {
		let obj = dkwucs.get(dkw);
		if (!obj.p && !obj.k) return;
		if (obj.k && obj.k[0][0] == "=") return;

		let ret = dkwucs.array(dkw);
                if (ret.length < 2) return;
                show_cell(dkw, $("<div>").appendTo($list), true);
            });
            $list.append("[" + $list.find("span.c").size() + "]");
        },

        // ダッシュ
        "dash": ($list) => {
            dkwucs.keys().forEach(dkw => {
                if (0 != parseInt(dkw.split(".").pop()))
                    show_cell(dkw, $("<div>").appendTo($list));
            });
            $list.append("[" + $list.find("span.c").size() + "]");
        },

        //欠番
        "missing": ($list) => {
	    for (let i = 1; i <= 49964; i++) {
		if (!dkwucs.getv(i)) {
		    show_cell(i + ".0", $("<div>").addClass("cell").appendTo($list));
		}
	    }
	    $list.append("[" + $list.find("span.c").size() + "]<br/>");
        },
    };
    drawlist.vs0 = drawlist.vs;
    
    $("#listmenu span").click(function() {
        if ($(this).hasClass("selected")) return;
        $(this).siblings().removeClass("selected");
	$("#pager a").removeClass("selected");
        $(this).addClass("selected");
        $("#list .content").hide();
        let name = $(this).attr("id");
        let id = "content_" + name;
        if ($("#" + id).length > 0) {
            $("#" + id).show();
            return;
        }
        drawlist[name]($("<div>").attr("id", id).addClass("content").appendTo("#list"));
        set_cell_clickevents();
    });

    // 検索
    $("#searchbar").change(function() {
        let str = $(this).val();
        if (!str) return;

        $("#searchres").text("");
	let keys = dkwucs.keys();
	
        Array.from(str).forEach(c => {
            keys.filter(dkw => dkwucs.concat(dkw).indexOf(c) != -1)
		.forEach(dkw => show_cell(dkw, $("<div>").appendTo("#searchres")));
        });
        set_cell_clickevents();
	
    });
    
    let $li = $("#pager");
    pager(1, 50000, $li);
    pager(1, 805, $li, true);

});
