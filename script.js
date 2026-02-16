const listaLivrosEl = document.getElementById("lista-livros");
const buscarEl = document.getElementById("buscar");
const filtroGeneroEl = document.getElementById("filtro-genero");
const contagemCarrinhoEl = document.getElementById("contagem-carrinho");
const verCarrinhoBtn = document.getElementById("ver-carrinho");
const modalCarrinho = document.getElementById("modal-carrinho");
const itensCarrinhoEl = document.getElementById("itens-carrinho");
const fecharCarrinhoBtn = document.getElementById("fechar-carrinho");
const finalizarBtn = document.getElementById("finalizar");
const formAdicionar = document.getElementById("form-adicionar");

let livros = [];
let carrinho = JSON.parse(localStorage.getItem("beon_carrinho") || "{}");

function flash(msg) {
  const f = document.createElement("div");
  f.textContent = msg;
  f.style.position = "fixed";
  f.style.right = "16px";
  f.style.bottom = "16px";
  f.style.background = "#0b5f3a";
  f.style.color = "#fff";
  f.style.padding = "8px 12px";
  f.style.borderRadius = "6px";
  f.style.zIndex = "9999";
  document.body.appendChild(f);
  setTimeout(() => f.remove(), 2000);
}

function salvarCarrinho() {
  localStorage.setItem("beon_carrinho", JSON.stringify(carrinho));
  atualizarContagemCarrinho();
}

function atualizarContagemCarrinho() {
  const count = Object.values(carrinho).reduce((s, n) => s + n, 0);
  contagemCarrinhoEl.textContent = count;
}

function renderizarLivros(list) {
  listaLivrosEl.innerHTML = "";
  if (!list.length) {
    listaLivrosEl.innerHTML = "<p>Nenhum livro encontrado.</p>";
    return;
  }
  list.forEach((b) => {
    const el = document.createElement("article");
    el.className = "livro";
    el.innerHTML = `
      <img src="${b.image}" alt="${b.title}">
      <h3>${b.title}</h3>
      <div class="meta">${b.author} • ${b.genre}</div>
      <p class="desc">${b.description}</p>
  <div class="price">${b.price_week.toFixed(2)} Metical/sem</div>
      <button data-id="${b.id}">Alugar</button>
    `;

    el.dataset.id = String(b.id);
    el.dataset.title = b.title.toLowerCase();
    el.dataset.author = b.author.toLowerCase();
    el.dataset.genre = b.genre;
    el.dataset.price = String(b.price_week);
    const btn = el.querySelector("button");

    btn.dataset.id = String(b.id);
    listaLivrosEl.appendChild(el);
  });
}

function parsePriceText(text) {
  if (!text) return 0;
  const m = text.match(/([0-9.,]+)/);
  if (!m) return 0;
  return parseFloat(m[1].replace(/,/g, "")) || 0;
}

function normalizarLivrosEstaticos() {
  const staticContainer = document.getElementById("livros-estaticos");
  if (!staticContainer) return;
  staticContainer.querySelectorAll(".livro").forEach((el, idx) => {
    if (!el.dataset.id)
      el.dataset.id = el.querySelector("button")?.dataset.id || "s" + (idx + 1);
    const title = el.querySelector("h3")?.textContent?.trim() || "";
    const meta = el.querySelector(".meta")?.textContent || "";
    const parts = meta.split("•").map((s) => (s ? s.trim() : ""));
    const author = parts[0] || "";
    const genre = parts[1] || "";
    el.dataset.title = title.toLowerCase();
    el.dataset.author = author.toLowerCase();
    el.dataset.genre = genre;
    const priceText = el.querySelector(".price")?.textContent || "";
    el.dataset.price = String(parsePriceText(priceText));

    const btn = el.querySelector("button");
    if (btn && !btn.dataset.id) btn.dataset.id = el.dataset.id;
  });
}

document.addEventListener("click", function (e) {
  const btn = e.target.closest && e.target.closest("button");
  if (!btn) return;
  const livroEl = btn.closest && btn.closest(".livro");
  if (!livroEl) return;
  const id = btn.dataset.id || livroEl.dataset.id;
  if (id) {
    e.preventDefault();
    abrirModalAluguel(String(id));
  }
});

const modalAluguel = document.getElementById("modal-aluguel");
const formAluguel = document.getElementById("form-aluguel");
const cancelarAluguel = document.getElementById("cancelar-aluguel");

function abrirModalAluguel(livroId) {
  let livro = livros.find((b) => String(b.id) === livroId);
  if (!livro) {
    const el = document.querySelector(`.grade-livros .livro[data-id="${livroId}"]`);
    if (el) {
      livro = {
        id: livroId,
        title: el.querySelector("h3")?.textContent?.trim() || "",
        price_week: parseFloat(el.dataset.price) || 0,
      };
    }
  }

  if (formAluguel) {
    formAluguel.querySelector("#id-livro").value = livroId;
    formAluguel.querySelector("#titulo-livro").value = livro?.title || "";
  }
  if (modalAluguel) modalAluguel.setAttribute("aria-hidden", "false");
}

function fecharModalAluguel() {
  if (modalAluguel) modalAluguel.setAttribute("aria-hidden", "true");
  if (formAluguel) formAluguel.reset();
}

async function enviarAluguel(dataObj) {
  const url = "salvar_aluguel.php";
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dataObj),
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const json = await res.json();
    if (json && json.success) {
      flash("Aluguel registrado com sucesso (servidor).");
      return { ok: true, server: true };
    } else {
      throw new Error(
        json && json.message ? json.message : "Resposta inválida"
      );
    }
  } catch (err) {
    const key = "beon_alugueis";
    const arr = JSON.parse(localStorage.getItem(key) || "[]");
    arr.push(
      Object.assign(
        { saved_local: true, saved_at: new Date().toISOString() },
        dataObj
      )
    );
    localStorage.setItem(key, JSON.stringify(arr));
    flash("Servidor indisponível — aluguel salvo localmente.");
    return { ok: false, server: false };
  }
}

if (cancelarAluguel) {
  cancelarAluguel.addEventListener("click", fecharModalAluguel);
}
if (formAluguel) {
  formAluguel.addEventListener("submit", async function (e) {
    e.preventDefault();
    const fd = new FormData(formAluguel);
    const payload = {
      id_livro: fd.get("id_livro"),
      titulo_livro: fd.get("titulo_livro"),
      nome_locatario: fd.get("nome-locatario"),
      contato_locatario: fd.get("contato-locatario"),
      data_inicio: fd.get("data-inicio"),
      semanas: Number(fd.get("semanas")) || 1,
      criado_em: new Date().toISOString(),
    };

    const el = document.querySelector(
      `.grade-livros .livro[data-id="${payload.id_livro}"]`
    );
    if (el) {
      payload.preco_semana = parseFloat(el.dataset.price) || 0;
    }

    const result = await enviarAluguel(payload);

    adicionarAoCarrinho(payload.id_livro);
    fecharModalAluguel();
  });
}

function adicionarAoCarrinho(id) {
  const key = String(id);
  carrinho[key] = (carrinho[key] || 0) + 1;
  salvarCarrinho();
}

function popularGeneros() {
  const set = new Set();
  livros.forEach((b) => set.add(b.genre));
  document.querySelectorAll("#livros-estaticos .livro").forEach((el) => {
    if (el.dataset.genre) set.add(el.dataset.genre);
  });

  filtroGeneroEl.innerHTML = '<option value="">Todos os gêneros</option>';
  Array.from(set)
    .sort()
    .forEach((g) => {
      const opt = document.createElement("option");
      opt.value = g;
      opt.textContent = g;
      filtroGeneroEl.appendChild(opt);
    });
}

if (formAdicionar) {
  formAdicionar.addEventListener("submit", function (e) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const newId = (livros.reduce((m, b) => Math.max(m, b.id), 0) || 0) + 1;
    const livro = {
      id: newId,
      title: (data.get("titulo") || "Livro sem título").trim(),
      author: (data.get("autor") || "Autor desconhecido").trim(),
      genre: (data.get("genero") || "Geral").trim(),
      price_week: Math.max(500, parseFloat(data.get("price_week")) || 500),
      image:
        data.get("imagem") || "https://picsum.photos/seed/" + newId + "/600/900",
      description: (data.get("descricao") || "").trim(),
    };
    livros.push(livro);

    filtroGeneroEl.innerHTML = '<option value="">Todos os gêneros</option>';
    popularGeneros();
    aplicarFiltros();
    form.reset();
    flash("Livro adicionado localmente");
  });
}

function aplicarFiltros() {
  const q = (buscarEl.value || "").toLowerCase().trim();
  const genre = filtroGeneroEl.value;

  document.querySelectorAll(".grade-livros .livro").forEach((el) => {
    const title = el.dataset.title || "";
    const author = el.dataset.author || "";
    const g = el.dataset.genre || "";
    const matchesQ = !q || title.includes(q) || author.includes(q);
    const matchesG = !genre || g === genre;
    el.style.display = matchesQ && matchesG ? "" : "none";
  });
}

function renderizarCarrinho() {
  itensCarrinhoEl.innerHTML = "";
  const ids = Object.keys(carrinho);
  if (!ids.length) {
    itensCarrinhoEl.innerHTML = "<p>Carrinho vazio.</p>";
    return;
  }
  let total = 0;
  ids.forEach((id) => {
    const qty = carrinho[id];
    let livro = livros.find((b) => String(b.id) === id);

    if (!livro) {
      const el = document.querySelector(`.grade-livros .livro[data-id="${id}"]`);
      if (el) {
        livro = {
          id: id,
          title: (el.querySelector("h3")?.textContent || "Livro").trim(),
          price_week: parseFloat(el.dataset.price) || 0,
        };
      } else {
        return;
      }
    }
    const row = document.createElement("div");
    row.className = "cart-row";
    row.innerHTML = `<strong>${
      livro.title
    }</strong> — ${qty} x ${livro.price_week.toFixed(2)} Metical = ${(
      qty * livro.price_week
    ).toFixed(2)} Metical`;
    const remove = document.createElement("button");
    remove.textContent = "Remover";
    remove.style.marginLeft = "8px";
    remove.addEventListener("click", () => {
      delete carrinho[id];
      salvarCarrinho();
      renderizarCarrinho();
    });
    row.appendChild(remove);
    itensCarrinhoEl.appendChild(row);
    total += qty * livro.price_week;
  });
  const totalEl = document.createElement("p");
  totalEl.style.fontWeight = "700";
  totalEl.textContent = "Total semanal: " + total.toFixed(2) + " Metical";
  itensCarrinhoEl.appendChild(totalEl);
}

buscarEl.addEventListener("input", aplicarFiltros);
filtroGeneroEl.addEventListener("change", aplicarFiltros);
verCarrinhoBtn.addEventListener("click", () => {
  modalCarrinho.setAttribute("aria-hidden", "false");
  renderizarCarrinho();
});
fecharCarrinhoBtn.addEventListener("click", () =>
  modalCarrinho.setAttribute("aria-hidden", "true")
);
finalizarBtn.addEventListener("click", () => {
  alert("Simulação: pedido finalizado. (Carrinho será limpo)");
  carrinho = {};
  salvarCarrinho();
  renderizarCarrinho();
  modalCarrinho.setAttribute("aria-hidden", "true");
});
