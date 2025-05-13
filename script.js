/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map(
      (product) => `
    <div class="product-card" data-id="${product.id}" data-name="${product.name}">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
      </div>
    </div>
  `
    )
    .join("");

  // Add click event listeners to product cards
  const productCards = document.querySelectorAll(".product-card");
  productCards.forEach((card) => {
    card.addEventListener("click", () => {
      // Toggle the "selected" class on the clicked card
      card.classList.toggle("selected");

      // Add or remove the product from the selectedProductsList
      const productId = card.getAttribute("data-id");
      const productName = card.getAttribute("data-name");

      if (card.classList.contains("selected")) {
        // Add product to the selected list
        const selectedItem = document.createElement("div");
        selectedItem.classList.add("selected-product");
        selectedItem.setAttribute("data-id", productId);
        selectedItem.textContent = productName;
        selectedProductsList.appendChild(selectedItem);
      } else {
        // Remove product from the selected list
        const itemToRemove = selectedProductsList.querySelector(
          `.selected-product[data-id="${productId}"]`
        );
        if (itemToRemove) {
          selectedProductsList.removeChild(itemToRemove);
        }
      }
    });
  });
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const selectedCategory = e.target.value;

  /* filter() creates a new array containing only products 
     where the category matches what the user selected */
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory
  );

  displayProducts(filteredProducts);
});

// Array to track conversation context
const messages = [
  {
    role: "system",
    content:
      "You are a helpful and knowledgeable chatbot trained to answer questions specifically about L’Oréal products, including skincare, haircare, cosmetics, and beauty routines. Only respond to questions that relate directly to L’Oréal’s product lines, usage tips, ingredients, or personalized beauty recommendations based on L’Oréal offerings. If a question falls outside this scope, politely redirect the user to ask about L’Oréal products or routines.",
  },
];

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  messages.push({ role: "user", content: userInput.value });
  // Get user input
  const userMessage = userInput.value.trim();
  if (!userMessage) return;

  // Add user message to the conversation context
  messages.push({ role: "user", content: userMessage });

  // Display user message in the chat window
  chatWindow.innerHTML += `<div class="msg user">${userMessage}</div>`;
  userInput.value = ""; // Clear input field

  // Display loading message
  chatWindow.innerHTML += `<div class="msg ai">Thinking...</div>`;
  chatWindow.scrollTop = chatWindow.scrollHeight;

  try {
    // Send POST request to the Cloudflare Worker
    const response = await fetch(
      "https://project8workerbetatest.tara-brichetto.workers.dev/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages }),
      }
    );

    // Parse the response
    const data = await response.json();
    const aiMessage = data.choices[0].message.content;

    // Add AI response to the conversation context
    messages.push({ role: "assistant", content: aiMessage });

    // Display the user's latest question above the AI's response
    chatWindow.innerHTML += `
      <div class="msg user latest-question">Your Question: ${userMessage}</div>
      <div class="msg ai">${aiMessage}</div>
    `;

    // Remove the previous "latest question" if it exists
    const previousLatestQuestion = document.querySelector(".latest-question");
    if (previousLatestQuestion) {
      previousLatestQuestion.remove();
    }
  } catch (error) {
    // Handle errors
    chatWindow.innerHTML += `<div class="msg ai">Sorry, something went wrong. Please try again later.</div>`;
    console.error("Error:", error);
  }

  // Scroll to the latest message
  chatWindow.scrollTop = chatWindow.scrollHeight;
});

/* Handle "Generate Routine" button click */
const generateRoutineButton = document.getElementById("generateRoutine");

generateRoutineButton.addEventListener("click", async () => {
  // Collect selected product data
  const selectedProducts = Array.from(
    selectedProductsList.querySelectorAll(".selected-product")
  ).map((productElement) => {
    const productId = productElement.getAttribute("data-id");
    const productName = productElement.textContent;

    // Find additional product details from the displayed products
    const productCard = productsContainer.querySelector(
      `.product-card[data-id="${productId}"]`
    );
    const productBrand = productCard
      ? productCard.querySelector("p").textContent
      : "Unknown Brand";

    return {
      id: productId,
      name: productName,
      brand: productBrand,
    };
  });

  // Check if there are selected products
  if (selectedProducts.length === 0) {
    chatWindow.innerHTML += `<div class="msg ai">Please select at least one product to generate a routine.</div>`;
    return;
  }

  // Display loading message
  chatWindow.innerHTML += `<div class="msg ai">Generating your beauty routine...</div>`;
  chatWindow.scrollTop = chatWindow.scrollHeight;

  try {
    // Send selected product data to the API
    const response = await fetch(
      "https://project8workerbetatest.tara-brichetto.workers.dev/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content:
                "You are a beauty advisor. Generate a personalized beauty routine based on the provided products. Format the response with proper spacing and lists for readability.",
            },
            {
              role: "user",
              content: `Here are the selected products: ${JSON.stringify(
                selectedProducts
              )}. Please create a beauty routine.`,
            },
          ],
        }),
      }
    );

    // Parse the API response
    const data = await response.json();
    const aiRoutine = data.choices[0].message.content;

    // Display the AI-generated routine in the chat window with preserved formatting
    chatWindow.innerHTML += `<div class="msg ai" style="white-space: pre-wrap;">${aiRoutine}</div>`;
  } catch (error) {
    // Handle errors
    chatWindow.innerHTML += `<div class="msg ai">Sorry, something went wrong while generating your routine. Please try again later.</div>`;
    console.error("Error:", error);
  }

  // Scroll to the latest message
  chatWindow.scrollTop = chatWindow.scrollHeight;
});
