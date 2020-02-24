var vol = [1, 1450, 4675, 7411, 11530, 14415, 17575, 22678, 28108, 32804, 38700, 42210, 48903];
var gwiki = false;


$(function() {
    $.ajaxSetup({cache:false});
    var ucs = {};
    $("<div>").attr("id", "content_refdiff").addClass("content").appendTo("#list")

    $.get("mj0502_pickup.txt", function(txt) {
        txt.split("\n").forEach(line => {
            if (!line) return;
            var tbl = line.trim().split("\t");
            var m = tbl.shift().match(/^(h?[0-9]+)('*)$/);
            if (!m) { console.log(line); return; }
	    var code = (m[1]) + "." + m[2].length;
            ucs[code] = {
		mj: tbl.shift().split("_")
		    .map(c => String.fromCodePoint(parseInt(c, 16)))
		    .join("")
	    };
	});

	$.getJSON("dkwappend.json", function(table) {
	    /*
	    table = table.map(obj => {
		if (!obj.p) return obj;
		if (obj.p[0][0]=='=') return obj;
		//return obj;
		
		obj.p = obj.p//.map(v => v.split("*").shift())
		    .filter(v => !(obj.m && v == obj.m[0]) && !(obj.k && obj.k.length == 1 && v == obj.k[0]))
		    .map(v => ((obj.m && v == (obj.m[0]+'*')) || (obj.k && obj.k.length == 1 && v == (obj.k[0]+'*'))) ? '*':v)
		    .map(
			v => Array.from(v).map(c => {
			    if (c.match(/\uDB40[\uDD00-\uDdeF]/)) {
				return '+'+(((c.charCodeAt(0) & 0x3ff) << 10 | (c.charCodeAt(1) & 0x3ff)) + 0x10000).toString(16);
			    }
			    return c;
			}).join('')
		    );
		console.log(obj.d,obj.p);
		return obj;
	    });

	    $("#hoge").val(	    		JSON.stringify(table));
	    */
            table.forEach(obj => {
		var code = obj.d;
		if (!ucs[code]) ucs[code] = {mj: ""};
		if (obj.k) {
		    obj.k = obj.k.filter(v => v[0] != "#");
		    if (obj.k.length) ucs[code].k = obj.k;
		}
		if (obj.p) {
		    obj.p = obj.p.map(v => v.split("*").shift())
			.filter(v => (v != "") && !(obj.m && v == obj.m[0]) && !(obj.k && v == obj.k[0]));
		    if (obj.p.length) ucs[code].p = obj.p.map(
			v => v.split("+")
			    .map(c => c.indexOf("e01") < 0 ? c : String.fromCodePoint(parseInt(c, 16)))
			    .join("")
		    );
		}
            });

            redraw(location.href.split("#")[1]);
	    $("#list, #listmenu").show();
	    $("#ucs").hide();
	}, function(e) {
	    console.log(e);
	});
    });

    var PER = 200;

    // テーブル描画する
    var redraw = (str) => {
        var is_hokan = false;
        if (!str) str = "";
        if (str.indexOf("h") != -1) { is_hokan = true; str = str.split("h").join(""); }
        var val = parseInt(str, 10);
	$("#listmenu span, #pager a").removeClass("selected");
        $("#pager a").each(function() {
            var aval = $(this).text();
            var hval = val.toString(10) + (is_hokan ? "h" : "");
            if (aval == hval) $(this).addClass("selected");
        });
        var st = val * 100 + 1;
        
        if (!st) st = 1;

        $("#list .content").hide();
        $("#cjktable").text("").show();

        for (var i = 0; i < PER / 20; i++) {
            var $tr = $("<tr>").appendTo("#cjktable");
            for (var j = 0; j < 20; j++) {
                var $td = $("<td>").appendTo($tr);
            }
        }
        $("#cjktable td").each(function(idx) {
            var $td = $(this);

            const set_td = (dash) => {
                let code = ("0000" + (st + idx).toString(10)).substr(-5) + "." + dash;
                if (is_hokan)
                    code = "h" + ("000" + (st + idx).toString(10)).substr(-4) + "." + dash;
                
                if (dash != 0) {
                    if(!ucs[code]) return;
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
    var set_cell_clickevents = function() {
        $(".cell").click(function() {
            var $rem = $(this).find(".ucs.other");
            if ($rem.length && $rem.is(":visible")) {
                return;
            }
            $(".ucs.other").hide();
            $rem.show();

            var ucs = $(this).find(".h span.ucs")
		.filter(function() { return !$(this).hasClass("d"); })
		.map(function() {return $(this).text(); })
		.get()
                .map(str => {
                    return Array.from(str).map(function(c) {
                        if (!c.match(/^[\uD800-\uDBFF][\uDC00-\uDFFF]$/))
                            return c.charCodeAt(0);
                        return ((c.charCodeAt(0) & 0x3ff) << 10 | (c.charCodeAt(1) & 0x3ff)) + 0x10000;
                    }).map(ucs => "U+" + ucs.toString(16).toUpperCase()).join(" ");
                });
            $("#ucs").text(": " + ucs.map(str => "[" + str + "]").join("")).show();

	    var dkw = $(this).find(".c").text();
	    var dp = dkw.match(/^(補?)([0-9]+)('*)/);
            let code = ("0000" + (dp[2]).toString(10)).substr(-5) + "d".repeat(dp[3].length);
	    if (dp[1]) code = "h" + code.slice(1);
            let url = "//glyphwiki.org/wiki/dkw-" + code;
	    $("<a>").attr("href", url).text(dkw).prependTo("#ucs");
        });
    };

    // セルを描画する
    //[td.cell][span.h:(char)][span.c:12345[div.remarks]]
    var show_cell = (code, $td, is_exposed) => {
        $td.addClass("cell");
        var $h = $("<span>").addClass("h").appendTo($td);
        var $c = $("<span>").addClass("c").text(dkwformat(code)).appendTo($td);

        //欠番
        if (!ucs[code]) {
            $td.css("background-color", "#aaa");
            return;
        }

        //UCS未定義
        if (ucs[code].p && ucs[code].p[0] == "〓") { 
            var dp = code.split(".");
            var imgname = "dkw-" + dp[0].toLowerCase() + "d".repeat(dp[1] * 1);
            $("<img>").appendTo($h).attr("src", "//glyphwiki.org/glyph/" + imgname + ".svg").css("width","50px");
            $td.css("background-color", "#ffd");
            return;
        }
	
	//$dom に c(utf) を表示する
        var set_char = function(c, $dom) {
	    $dom.html(c).addClass("ucs");

            var c = $dom.text();
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
                $dom.text(c.substr(0, c.length - 1));
            }
        };
        
        //通常
        var $rem = $("<div>").addClass("remarks").appendTo($c).hide();
        if (typeof(ucs[code]) != "object") return;
        $h.css("width", "auto");
	if (ucs[code].p)
            set_char(ucs[code].p, $("<span>").css("background-color","#bee").appendTo($h));
	if (ucs[code].mj)
            set_char(ucs[code].mj, $("<span>").appendTo($h).css({'background-color':'#f7f7f7'}));
	if (ucs[code].k) {
	    var c = ucs[code].k[0];

	    //重複
            if (c.indexOf("=") == 0) {
		var $dom = $("<span>").css("background-color","#cdc").appendTo($h);
                var d = c.slice(1);
		set_char(ucs[d].mj || ucs[d].k[0], $dom);
		$("<span class='d ucs'>").text("(=" + dkwformat(d) + ")").appendTo($h);

            } else {
		ucs[code].k.forEach(c => set_char(c, $("<span>").css("background-color","#cdc").appendTo($h)));
	    }
	}


        if ($h.find(".ucs").size() > 1 && !is_exposed) {
            $h.css({"position": "relative"});
	    $c.css({"color":"blue", "text-decoration":"underline"});
	    $h.find(".ucs:not(:first-child)").addClass("other").each(function(i) {
		$(this).hide().css({'top': 55 * (i + 1) +'px'});
	    });
	}
	

        if (!gwiki) return;
        var m = code.match(/^(h?[0-9]+)\.([0-2])/);
	if (!m) return;

	$("<img>").attr("src", "//glyphwiki.org/glyph/dkw-" + m[1].toLowerCase() +
			"d".repeat(m[2]) + ".svg")
            .css({"width":"50px", "height":"50px", "background-color":"#ffc"}).appendTo($h);
        $h.css("height", "auto");
    };

    // CJK互換を統合漢字に変換する; otherwise false
    var is_cjkcompat = (c) => {
        if (c.match(/^[\uF900-\uFAFF]/)) {
            var offset = c.charCodeAt(0) - 0xf900;
            if (offset < 0) return false;
            var uni = cjkcompat[0][offset];
            if (!uni) return false;
            return String.fromCodePoint(uni) || false;
        }
        if (c.match(/^[\uD800-\uDBFF][\uDC00-\uDFFF]/)) {
            c = c.substr(0, 2);
            var code = (c.charCodeAt(0) & 0x3ff) << 10 | (c.charCodeAt(1) & 0x3ff);
            code += 0x10000;
            if (code < 0x2f800 || 0x2fb00 <= code) return false;
            return String.fromCodePoint(cjkcompat[1][code - 0x2f800]);
        }
        return false;
    };

    var stringFromCodePoint = function(codeNum) {
        var cp = codeNum - 0x10000;
        var high = 0xD800 | (cp >> 10);
        var low = 0xDC00 | (cp & 0x3FF);
        return String.fromCharCode(high, low);
    };


    // xxxxx.xを整形する
    var dkwformat = function(dkw) {
        var dp = dkw.split(".");
        var is_hokan = (dp[0][0] == "h");
        return (is_hokan ? "補" : "")
            + parseInt(is_hokan ? dp[0].slice(1) : dp[0], 10)
            + ("'".repeat(dp[1] * 1));
    };
    
    // ページャを表示する
    var pager = (start, end, $li, is_hokan) => {
        var st = parseInt(start / PER) * PER;
        for(var i = st; i < end; i += PER) {
            var p = parseInt(i / 100);
            if (is_hokan) p += "h";
            $("<a>").text(p).attr("href", "#" + p).appendTo($li);
            $li.append(" ");
        }
        $("#pager a").click(function() {
            var str = $(this).attr("href").split("#").pop();
            redraw(str);
        });
    };

    //リストを表示する
    var drawlist = {
        //統合1(異体字セレクタ分離)
        "vs": ($list) => {

            // UCS統合テーブルの作成
            let ret = {};
            let inclvs = [];
            Object.keys(ucs).sort().forEach(dkw => {
                var code = ucs[dkw].mj;
                if (!code) return;
                var is_vs = (code.match(/\uDB40[\uDD00-\uDdeF]/) || is_cjkcompat(code));

                // 統合漢字表現に統一する
                var ucode = is_cjkcompat(code) || code.replace(/\uDB40[\uDD00-\uDdeF]/g, "");

                if (ret[ucode])
                    ret[ucode].push(dkw);
                else
                    ret[ucode] = [dkw];

		//console.log(ucode, code);
                if (ucode != code) inclvs.push(ucode);
            });

            inclvs = inclvs.filter((c, i, self) => (self.indexOf(c) == i));
            console.log(inclvs);
            
            // 結果表示
            ["vs", "vs0"].forEach((name) => {
		if (name == "vs0") return;
                var id = "content_" + name;
                var $list = $("#" + id);
                if ($list.length == 0)
                    $list = $("<div>").attr("id", id).addClass("content").appendTo("#list").hide();
                
                inclvs.forEach(ucode => {
                    if (name == "vs" && ret[ucode].length == 1) return;
                    if (name == "vs0" && ret[ucode].length != 1) return;
                    var $group = $("<div>").appendTo($list).css("padding", "0");
                    ret[ucode].forEach(dkw => {
                        var $div = $("<div>").appendTo($group).css("border", "none");
                        show_cell(dkw, $div, false);
                    });
                });
                $list.append("[" + $list.find("span.c").size() + "]<br/>");
            });
            $list.show();
        },

        //欠番
        "missing": ($list) => {
	    var missing = [];
	    for (var i = 1; i <= 49964; i++) if (!ucs[("0000" + i).slice(-5) + ".0"]) missing.push(i);
            missing.forEach(dkw => show_cell(dkw + ".0", $("<div>").addClass("cell").appendTo($list)));
	    $list.append("[" + $list.find("span.c").size() + "]<br/>");
        },

        //統合(同一符号化)
        "unified": ($list) => {
            var ret = {};
            Object.keys(ucs).sort().forEach(dkw => {
                var code = (ucs0 => {
		    if (ucs0.p && ucs0.p[0] != "〓") return ucs0.p[0].split("*").join("");
		    if (ucs0.k && ucs0.k[0][0] == "=") return false;
		    if (ucs0.mj) return ucs0.mj;
		    return ucs0.k && ucs0.k[0];
		})(ucs[dkw]);
                if (!code) return;

                if (ret[code])
                    ret[code].push(dkw);
                else
                    ret[code] = [dkw];
            });
            Object.keys(ret).sort().forEach(code => {
                if (ret[code].length < 2) return;

                var $group = $("<div>").appendTo($list).css("padding", "0");
                ret[code].forEach(dkw => {
                    var $div = $("<div>").appendTo($group).css("border", "none");
                    show_cell(dkw, $div, false);
                });
            });
            $list.append("[" + $list.find(".c").size() + "]");
        },
        // UCS未定義
        "undefined": ($list) => {
            Object.keys(ucs).forEach(dkw => {
                var code = ucs[dkw].p;
                if (code && code == "〓") 
                    show_cell(dkw, $("<div>").addClass("cell").appendTo($list));
            });
            $list.append("[" + $list.find(".c").size() + "]");
        },
	// 統合3(IVS未定義)
        "undefvs": ($list) => {
            Object.keys(ucs).sort().forEach(dkw => {
                if (!ucs[dkw].p || !ucs[dkw].p.some(u => u.match(/\*$/))) return;
                show_cell(dkw, $("<div>").addClass("cell").appendTo($list));
            });
            $list.append("[" + $list.find(".c").size() + "]");
        },
        // 統合(重複)
        "duplicated": ($list) => {
            Object.keys(ucs).sort().forEach(dkw => {
                var code = ucs[dkw].k;
                if (!code || code[0].indexOf("=") != 0) return;
                var $cell = $("<div>").appendTo($list).css("padding", "0");
                show_cell(code[0].slice(1), $("<div>").appendTo($cell).css("border", "none"));
		show_cell(dkw, $("<div>").appendTo($cell).css("border", "none"));
		//console.log(dkw);
                //$cell.find(".c").append("<br>" + dkwformat(dkw));
            });
            $list.append("[" + $list.find("span.c").size() + "]");
        },
    
        // 複数通りのUCS表現
        "multiple" : ($list) => {
            Object.keys(ucs).sort().forEach(function(dkw) {
		if (!ucs[dkw].p && !ucs[dkw].k) return;
		if (ucs[dkw].k && ucs[dkw].k[0][0] == "=") return;
	        var ret = (ucs[dkw].mj || []).concat(ucs[dkw].k || []).concat(ucs[dkw].p || []);
                if (ret.length < 2) return;
                show_cell(dkw, $("<div>").appendTo($list), true);
            });
            $list.append("[" + $list.find("span.c").size() + "]");
        },

        // ダッシュ
        "dash": ($list) => {
            Object.keys(ucs).sort().forEach(function(dkw) {
                var d = parseInt(dkw.split(".").pop());
                if (d != 0)
                    show_cell(dkw, $("<div>").appendTo($list));
            });
            $list.append("[" + $list.find("span.c").size() + "]");
        },
    };
    drawlist.vs0 = drawlist.vs;
    
    $("#listmenu span").click(function() {
        if ($(this).hasClass("selected")) return;
        $(this).siblings().removeClass("selected");
	$("#pager a").removeClass("selected");
        $(this).addClass("selected");
        $("#list .content").hide();
        var name = $(this).attr("id");
        var id = "content_" + name;
        if ($("#" + id).length > 0) {
            $("#" + id).show();
            return;
        }
        drawlist[name]($("<div>").attr("id", id).addClass("content").appendTo("#list"));
        set_cell_clickevents();
    });

    // 検索
    $("#searchbar").change(function() {
        var str = $(this).val();
        if (!str) return;

        $("#searchres").text("");

        Array.from(str).forEach(c => {
            Object.keys(ucs).filter(key => {
		var obj = ucs[key];
		return ["mj", "k", "p"].map(t => (obj[t] || "")).toString().indexOf(c) != -1;
	    }).forEach(dkw => show_cell(dkw, $("<div>").appendTo("#searchres")));
        });
        set_cell_clickevents();
	
    });
    
    var $li = $("#pager");
    pager(1, 50000, $li);
    pager(1, 805, $li, true);

});
