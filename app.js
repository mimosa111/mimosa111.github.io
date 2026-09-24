const articles = window.PORTFOLIO_ARTICLES || [];

const state = {
  activeSlug: new URLSearchParams(window.location.search).get("article") || articles[0]?.slug,
  query: "",
};

const articleList = document.getElementById("articleList");
const topNav = document.getElementById("topNav");
const reader = document.getElementById("reader");
const searchInput = document.getElementById("searchInput");
const readingProgress = document.getElementById("readingProgress");

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function articleText(article) {
  return article.blocks
    .map((block) => {
      if (block.type === "paragraph") return block.text;
      if (block.type === "table") return block.rows.flat().join(" ");
      return "";
    })
    .join(" ");
}

function readingMinutes(article) {
  const text = articleText(article);
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const englishWords = (text.replace(/[\u4e00-\u9fff]/g, " ").match(/[A-Za-z0-9]+/g) || []).length;
  return Math.max(1, Math.ceil(chineseChars / 520 + englishWords / 220));
}

function filteredArticles() {
  const keyword = state.query.trim().toLowerCase();
  if (!keyword) return articles;
  return articles.filter((article) => {
    const haystack = `${article.title} ${article.preview} ${articleText(article)}`.toLowerCase();
    return haystack.includes(keyword);
  });
}

function setActive(slug, focusReader = true) {
  state.activeSlug = slug;
  const url = new URL(window.location.href);
  url.searchParams.set("article", slug);
  window.history.replaceState({}, "", url);
  render();
  if (focusReader) {
    reader.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function renderNavigation() {
  topNav.innerHTML = articles
    .map(
      (article) => `
        <button class="${article.slug === state.activeSlug ? "is-active" : ""}" data-slug="${escapeHtml(article.slug)}">
          ${escapeHtml(article.title)}
        </button>
      `,
    )
    .join("");

  topNav.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => setActive(button.dataset.slug));
  });
}

function renderArticleList() {
  const items = filteredArticles();
  if (!items.length) {
    articleList.innerHTML = `<p class="empty-state">未找到匹配的文章。</p>`;
    return;
  }

  articleList.innerHTML = items
    .map(
      (article) => `
        <button class="article-card ${article.slug === state.activeSlug ? "is-active" : ""}" data-slug="${escapeHtml(article.slug)}">
          <span class="meta-row">
            <span>${article.paragraphCount} 段</span>
            <span>约 ${readingMinutes(article)} 分钟</span>
          </span>
          <h2>${escapeHtml(article.title)}</h2>
          <p>${escapeHtml(article.preview || "点击阅读文章全文。")}</p>
        </button>
      `,
    )
    .join("");

  articleList.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => setActive(button.dataset.slug));
  });
}

function isLikelyHeading(text, index, article) {
  if (index === 0 || text === article.title) return false;
  const clean = text.trim();
  if (!clean) return false;
  if (/^\d+[\.\u3001]\s+/.test(clean)) return true;
  if (/^(FAQ|External Resources|Summary|Table of Contents|Meta Description|Primary Keyword|Secondary Keywords|Keyword Selection Rationale)$/i.test(clean)) return true;
  if (clean.length <= 18 && !/[，。！？；,.!?;]/.test(clean)) return true;
  if (clean.length <= 42 && /[:：]$/.test(clean)) return true;
  return false;
}

function renderTable(block) {
  if (!block.rows.length) return "";
  const [head, ...body] = block.rows;
  return `
    <table class="data-table">
      <thead>
        <tr>${head.map((cell) => `<th>${escapeHtml(cell)}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${body.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}
      </tbody>
    </table>
  `;
}

function renderBlock(block, index, article) {
  if (block.type === "image") {
    return `
      <figure class="figure">
        <img src="${escapeHtml(block.src)}" alt="${escapeHtml(block.alt || article.title)}" loading="lazy" />
      </figure>
    `;
  }

  if (block.type === "table") return renderTable(block);

  const text = block.text.trim();
  if (!text || (index === 0 && text === article.title)) return "";
  if (isLikelyHeading(text, index, article)) {
    const level = /^\d+[\.\u3001]\s+/.test(text) || text.length <= 18 ? "h3" : "h4";
    return `<${level}>${escapeHtml(text)}</${level}>`;
  }
  return `<p class="${index === 1 ? "lede" : ""}">${escapeHtml(text)}</p>`;
}

function renderReader() {
  const article = articles.find((item) => item.slug === state.activeSlug) || articles[0];
  if (!article) {
    reader.innerHTML = "";
    return;
  }

  const imageCount = article.blocks.filter((block) => block.type === "image").length;
  const content = article.blocks.map((block, index) => renderBlock(block, index, article)).join("");
  reader.innerHTML = `
    <header class="article-hero">
      <div class="article-meta">
        <span class="pill">约 ${readingMinutes(article)} 分钟阅读</span>
        <span class="pill">${article.paragraphCount} 段正文</span>
        <span class="pill">${imageCount} 张配图</span>
      </div>
      <h2>${escapeHtml(article.title)}</h2>
      <p>${escapeHtml(article.preview || "文章全文已整理为网页阅读版。")}</p>
    </header>
    <div class="content">
      ${content}
    </div>
  `;
}

function updateProgress() {
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
  const ratio = scrollHeight <= 0 ? 0 : Math.min(1, Math.max(0, scrollTop / scrollHeight));
  readingProgress.style.width = `${ratio * 100}%`;
}

function render() {
  renderNavigation();
  renderArticleList();
  renderReader();
  updateProgress();
}

searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  renderArticleList();
});

window.addEventListener("scroll", updateProgress, { passive: true });
window.addEventListener("resize", updateProgress);

render();
