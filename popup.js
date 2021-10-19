$(document).ready(() => {
  errorMessages = { 100: "신청할 수 없습니다.", 101: "신청이 불가능한 학년입니다.", 102: "신청 기간 시작 전입니다.", 103: "신청 기간이 끝났습니다.", 1041: "좌석 선택을 하지 않으려면 사유를 입력해야 합니다.", 1042: "사유를 입력해야 합니다.", 105: "이미 다른 사람이 신청한 좌석 입니다.", 106: "선착순 마감되었습니다.", 107: "이미 신청한 기상송 입니다.", 108: "더 이상 신청할 수 없습니다.", 109: "이미 다른 사람이 신청한 시간 입니다.", 403: "권한이 없습니다.", 404: "해당하는 데이터가 없습니다.", 400: "비정상적인 접근입니다.", 500: "예기치 못한 오류가 발생하였습니다.", 401: "재인증이 필요합니다." };

  fetch("https://api.dimigo.life/users/me")
    .then((res) => res.json())
    .then((res) => {
      if (!res.success) {
        $("#auth").text("인증하기(로그인)").prop("disabled", false);
        throw errorMessages[res.code];
      } else return res.data;
    })
    .then((me) => {
      chrome.storage.local.set({ studentdata: me });

      $("body").html(`
        <div id="me">${me.grade}${me.class}${me.number.toString().padStart(2, "0")} ${me.name}(${{ M: "남", F: "여" }[me.gender]}) [티켓 <b id="likeTicket">${me.likeTicket}</b>]</div>
        <button id="dimigolife">디미고라이프</button>
        <button id="music-req">곡 신청하기</button>
        <button id="music-chart">기상송 차트</button>
      `);
    })
    .catch((err) => console.log(err));

  $(document).on("click", "#auth, #dimigolife", (e) => {
    chrome.tabs.create({ url: "https://dimigo.life/" });
  }); // #auth, #dimigolife

  $(document).on("click", "#music-req", (e) => {
    q = prompt("검색어를 입력하세요.");
    if (!q) return;
    req = $("body").has("#req").length ? $("#req").html("로딩 중") : $(`<div id="req">로딩 중</div>`).insertAfter("#music-req");
    fetch("https://api.dimigo.life/music/search?q=" + q)
      .then((res) => res.json())
      .then((res) => {
        if ("code" in res) throw errorMessages[res.code];
        req.text("");
        res.forEach((d) => {
          req.append(`<div class="music" data-id="${d.id}">${d.title} - <small>${d.artist}</small></div>`);
        });
      })
      .catch((err) => alert(err));
  }); // #music-req

  $(document).on("click", "#req .music", (e) => {
    id = $(e.currentTarget).attr("data-id");
    really = confirm("이 곡을 신청하시겠습니까?");
    if (!really) return;
    chrome.storage.local.get(["studentdata"], (s) => {
      me = s.studentdata;
      if (me.likeTicket == 0) {
        alert("신청 티켓이 없습니다!");
        return;
      }
      fetch("https://api.dimigo.life/music/" + id, {
        method: "POST",
        headers: { Origin: "https://dimigo.life" },
      })
        .then((res) => res.json())
        .then((res) => {
          if (!res.success) throw errorMessages[res.code];
          alert(`성공적으로 신청했습니다.`);
          me.likeTicket -= 1;
          $("#likeTicket").text(me.likeTicket);
          chrome.storage.local.set({ studentdata: me });
        })
        .catch((err) => alert(err));
    });
  }); // #req .music

  $(document).on("click", "#music-chart", (e) => {
    $("#music-chart").prop("disabled", true);
    chart = $(`<div id="chart">로딩 중</div>`).insertAfter("#music-chart");

    chrome.storage.local.get(["studentdata"], (s) => {
      fetch("https://api.dimigo.life/music/chart?limit=100&gender=" + s.studentdata.gender)
        .then((res) => res.json())
        .then((res) => res.data.list)
        .then((musicchart) => {
          musicchart.forEach((music) => {
            music.liked = false;
          });

          fetch("https://api.dimigo.life/music/me")
            .then((res) => res.json())
            .then((res) => {
              musicme = [];
              res.data.forEach((mine) => {
                musicchart.forEach((music) => {
                  if (music.id == mine.id) {
                    musicme.push(music.id.toString());
                    music.liked = true;
                  }
                });
              });

              chart.text("");
              musicchart.forEach((music) => {
                chart.append(`<div class="music ${music.liked ? "liked" : ""}" data-id="${music.id}">${music.title} - <small>${music.artist}</small></div>`);
              });

              chrome.storage.local.set({ musicchart: musicchart });
              chrome.storage.local.set({ musicme: musicme });
            });
        });
    });
  }); // #music-chart

  $(document).on("click", "#chart .music", (e) => {
    id = $(e.currentTarget).attr("data-id");
    chrome.storage.local.get(["studentdata", "musicme"], (s) => {
      me = s.studentdata;
      musicme = s.musicme;
      already = musicme.includes(id);
      if (!already && me.likeTicket == 0) {
        alert("신청 티켓이 없습니다!");
        return;
      }
      fetch("https://api.dimigo.life/music/" + id, {
        method: already ? "DELETE" : "POST",
        headers: { Origin: "https://dimigo.life" },
      })
        .then((res) => res.json())
        .then((res) => {
          if (!res.success) throw errorMessages[res.code];
          me.likeTicket += already ? 1 : -1;
          $("#likeTicket").text(me.likeTicket);
          if (already) {
            $(e.currentTarget).removeClass("liked");
            idx = musicme.indexOf(id);
            if (idx == -1) throw "예기치 못한 오류가 발생하였습니다.";
            musicme.splice(idx, 1);
          } else {
            $(e.currentTarget).addClass("liked");
            musicme.push(id);
          }
          chrome.storage.local.set({ studentdata: me, musicme: musicme });
        })
        .catch((err) => alert(err));
    });
  }); // #chart .music
});
