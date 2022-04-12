$(document).ready(async () => {
  errorMessages = {
    100: "신청할 수 없습니다.",
    101: "신청이 불가능한 학년입니다.",
    102: "신청 기간 시작 전입니다.",
    103: "신청 기간이 끝났습니다.",
    1041: "좌석 선택을 하지 않으려면 사유를 입력해야 합니다.",
    1042: "사유를 입력해야 합니다.",
    105: "이미 다른 사람이 신청한 좌석입니다.",
    106: "선착순 마감되었습니다.",
    107: "이미 신청한 기상송입니다.",
    108: "더 이상 신청할 수 없습니다.",
    109: "이미 다른 사람이 신청한 시간입니다.",
    400: "비정상적인 접근입니다.",
    401: "재인증이 필요합니다.",
    403: "권한이 없습니다.",
    404: "해당하는 데이터가 없습니다.",
    500: "예기치 못한 오류가 발생하였습니다.",
  };

  const openDimigoLife = () => {
    chrome.tabs.create({ url: "https://life.dimigo.in/" });
  };

  const fetchURL = async (url, method = "GET") => {
    const response = await fetch(url, { method: method })
      .then((res) => res.json())
      .then((res) => {
        if ("code" in res) throw errorMessages[res.code];

        return res;
      })
      .catch((err) => {
        if (typeof err !== "string") $("body").html(`<button id='auth'>예상치 못한 버그가<br />발생했습니다. ${err.message}</button>`);
        else alert(err);

        return false;
      });
    return response;
  };
  const getMe = async () => await fetchURL("https://life.dimigo.in/api/users/me").then((res) => res.data);

  const listElementsOf = async (musicList) => {
    const container = $("<div></div>");
    musicList.forEach((music) => {
      container.append(`<div class="music" data-id="${music.id}">${music.title} - <small>${music.artist}</small></div>`);
    });

    const musicMe = await fetchURL("https://life.dimigo.in/api/music/me");
    musicMe.data.forEach((music) => {
      container.find(`.music[data-id="${music.id}"]`).addClass("liked");
    });

    return container.html();
  };

  const search = async (q) => {
    if (!$("#searchResult").length) return;

    if (q) $("#searchResult").attr("data-q", q);
    else q = $("#searchResult").attr("data-q");

    const searchResult = await fetchURL(`https://life.dimigo.in/api/music/search?q=${q}`);
    $("#searchResult").html(await listElementsOf(searchResult));
  };

  const reloadData = async () => {
    const me = await getMe();

    // me
    $("#me").html(`${me.grade}${me.class}${me.number.toString().padStart(2, "0")}
    ${me.name}(${{ M: "남", F: "여" }[me.gender]}) [티켓 <b id="likeTicket">${me.likeTicket}</b>]`);

    // chart
    if ($("#chart").length) {
      const musicChart = await fetchURL(`https://life.dimigo.in/api/music/chart?limit=100&gender=${me.gender}`);
      $("#chart").html(await listElementsOf(musicChart.data.list));
    }

    search();
  };

  // Initialization
  reloadData();

  $(document).on("click", "#auth, #dimigolife", openDimigoLife);

  $(document).on("click", "#search", (e) => {
    let q = prompt("검색어를 입력하세요.");
    if (!q) return;
    if ($("#searchResult").length) $("#searchResult").html("로딩 중");
    else $(`<div id="searchResult">로딩 중</div>`).insertAfter("#search");
    search(q);
  });

  const requestMusic = async (musicID, react = true) => {
    let response = await fetchURL(`https://life.dimigo.in/api/music/${musicID}`, "POST");

    if (response && react) {
      alert(`성공적으로 신청했습니다.`);
      reloadData();
    }
  };
  const deleteMusic = async (musicID, react = true) => {
    let response = await fetchURL(`https://life.dimigo.in/api/music/${musicID}`, "DELETE");

    if (response && react) {
      alert(`성공적으로 취소했습니다.`);
      reloadData();
    }
  };

  $(document).on("click", ".music", async (e) => {
    let musicID = $(e.currentTarget).attr("data-id");

    let musicMe = await fetchURL("https://life.dimigo.in/api/music/me");

    let already = musicMe.data.find((music) => String(music.id) === musicID);

    if (already) {
      if (!confirm("이 곡을 취소하시겠습니까?")) return;
      deleteMusic(musicID);
    } else {
      if (!confirm("이 곡을 신청하시겠습니까?")) return;
      requestMusic(musicID);
    }
  });

  $(document).on("click", "#chart-toggle", (e) => {
    if ($("#chart").length) return $("#chart").remove();

    $(`<div id="chart">로딩 중</div>`).insertAfter("#chart-toggle");

    reloadData();
  });

  $(document).on("click", "#music-reset", async (e) => {
    if (!confirm("정말로 모든 티켓을 돌려받으시겠습니까?")) return;
    let musicMe = await fetchURL("https://life.dimigo.in/api/music/me");
    musicMe.data.forEach((music) => {
      deleteMusic(music.id, false);
    });
    alert("성공적으로 돌려받았습니다.");
    reloadData();
  });
});
