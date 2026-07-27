;(function checkoutCrossSelling() {
  'use strict'

  const COMPONENT_ID = 'checkout-cross-selling'
  const CART_HASH = '#/cart'

  let currentProductId = null
  let isLoading = false

  function isCartPage() {
    return window.location.hash.indexOf(CART_HASH) === 0
  }

  function formatCurrency(value) {
    try {
      return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value)
    } catch (_error) {
      return `$${value}`
    }
  }

  function escapeHTML(value) {
    const element = document.createElement('div')

    element.textContent = value == null ? '' : String(value)

    return element.innerHTML
  }

  function removeComponent() {
    const component = document.getElementById(COMPONENT_ID)

    if (component) {
      const container = component.parentElement

      component.remove()

      if (container) {
        container.classList.remove(
          'cart-template-holder--with-cross-selling'
        )
      }
    }

    currentProductId = null
  }

  function getComponentContainer() {
    const selectors = [
      '.cart-template-holder',
      '.cart-template.full-cart',
      '.cart-template',
      '.container-cart',
      '.cart',
    ]

    for (const selector of selectors) {
      const element = document.querySelector(selector)

      if (element) {
        return element
      }
    }

    return null
  }

  function getAvailableOffer(product) {
    if (!product || !Array.isArray(product.items)) {
      return null
    }

    for (const sku of product.items) {
      if (!Array.isArray(sku.sellers)) {
        continue
      }

      const seller = sku.sellers.find(function findAvailableSeller(
        sellerItem
      ) {
        const offer = sellerItem.commertialOffer

        return Boolean(
          offer &&
            Number(offer.AvailableQuantity) > 0 &&
            Number(offer.Price) > 0
        )
      })

      if (seller) {
        return {
          product,
          sku,
          seller,
          offer: seller.commertialOffer,
        }
      }
    }

    return null
  }

  function selectRecommendation(products, orderForm) {
    if (
      !Array.isArray(products) ||
      !products.length ||
      !orderForm ||
      !Array.isArray(orderForm.items)
    ) {
      return null
    }

    const productsInCart = new Set(
      orderForm.items.map(function mapCartProduct(item) {
        return String(item.productId)
      })
    )

    for (const product of products) {
      if (productsInCart.has(String(product.productId))) {
        continue
      }

      const recommendation = getAvailableOffer(product)

      if (recommendation) {
        return recommendation
      }
    }

    return null
  }

  function getProductImage(sku) {
    if (!sku || !Array.isArray(sku.images) || !sku.images.length) {
      return ''
    }

    return sku.images[0].imageUrl || ''
  }

  function getProductLink(product) {
    if (!product) {
      return '#'
    }

    if (product.link) {
      return product.link
    }

    if (product.linkText) {
      return `/${product.linkText}/p`
    }

    return '#'
  }

  function updateAddButtonState(orderForm) {
    const component = document.getElementById(COMPONENT_ID)

    if (
      !component ||
      !orderForm ||
      !Array.isArray(orderForm.items)
    ) {
      return
    }

    const button = component.querySelector(
      '.checkout-cross-selling__button'
    )

    const feedback = component.querySelector(
      '.checkout-cross-selling__feedback'
    )

    const recommendedSkuId = component.dataset.skuId

    if (!button || !recommendedSkuId) {
      return
    }

    const productIsInCart = orderForm.items.some(function checkItem(
      item
    ) {
      return String(item.id) === String(recommendedSkuId)
    })

    button.disabled = productIsInCart
    button.textContent = productIsInCart
      ? 'Producto agregado'
      : 'Agregar producto'

    if (feedback) {
      feedback.textContent = productIsInCart
        ? 'El producto ya está en el carrito.'
        : ''
    }
  }

  function createComponent(recommendation, orderForm) {
    const existingComponent = document.getElementById(COMPONENT_ID)

    if (existingComponent) {
      existingComponent.remove()
    }

    const container = getComponentContainer()

    if (!container) {
      return
    }

    const { product, sku, offer, seller } = recommendation

    const sellingPrice = Number(offer.Price)
    const listPrice = Number(offer.ListPrice)

    const hasDiscount =
      Number.isFinite(listPrice) &&
      Number.isFinite(sellingPrice) &&
      listPrice > sellingPrice

    const productImage = getProductImage(sku)
    const productLink = getProductLink(product)

    const component = document.createElement('aside')

    component.id = COMPONENT_ID
    component.className = 'checkout-cross-selling'
    component.dataset.skuId = String(sku.itemId)

    component.innerHTML = `
      <h2 class="checkout-cross-selling__title">
        Recomendado para vos
      </h2>

      <article class="checkout-cross-selling__card">
        <div class="checkout-cross-selling__image-container">
          ${
            productImage
              ? `
                <img
                  class="checkout-cross-selling__image"
                  src="${escapeHTML(productImage)}"
                  alt="${escapeHTML(product.productName)}"
                />
              `
              : `
                <div
                  class="
                    checkout-cross-selling__image
                    checkout-cross-selling__image--empty
                  "
                >
                  Sin imagen
                </div>
              `
          }
        </div>

        <div class="checkout-cross-selling__content">
          <a
            class="checkout-cross-selling__product-name"
            href="${escapeHTML(productLink)}"
          >
            ${escapeHTML(product.productName)}
          </a>

          <div class="checkout-cross-selling__prices">
            <strong class="checkout-cross-selling__selling-price">
              ${formatCurrency(sellingPrice)}
            </strong>

            ${
              hasDiscount
                ? `
                  <span class="checkout-cross-selling__list-price">
                    ${formatCurrency(listPrice)}
                  </span>
                `
                : ''
            }
          </div>

          <button
            type="button"
            class="checkout-cross-selling__button"
          >
            Agregar producto
          </button>

          <p
            class="checkout-cross-selling__feedback"
            aria-live="polite"
          ></p>
        </div>
      </article>
    `

    const button = component.querySelector(
      '.checkout-cross-selling__button'
    )

    const feedback = component.querySelector(
      '.checkout-cross-selling__feedback'
    )

    if (!button) {
      return
    }

    button.addEventListener('click', function handleAddProduct() {
      button.disabled = true
      button.textContent = 'Agregando...'

      if (feedback) {
        feedback.textContent = ''
      }

      const itemToAdd = {
        id: Number(sku.itemId),
        quantity: 1,
        seller: seller.sellerId,
      }

      if (
        !window.vtexjs ||
        !window.vtexjs.checkout ||
        typeof window.vtexjs.checkout.addToCart !== 'function'
      ) {
        button.disabled = false
        button.textContent = 'Agregar producto'

        if (feedback) {
          feedback.textContent =
            'No fue posible agregar el producto.'
        }

        return
      }

      window.vtexjs.checkout
        .addToCart(
          [itemToAdd],
          null,
          orderForm.salesChannel
        )
        .done(function addToCartSuccess(updatedOrderForm) {
          updateAddButtonState(updatedOrderForm)
        })
        .fail(function addToCartError() {
          button.disabled = false
          button.textContent = 'Agregar producto'

          if (feedback) {
            feedback.textContent =
              'No fue posible agregar el producto. Intentá nuevamente.'
          }
        })
    })

    container.classList.add(
      'cart-template-holder--with-cross-selling'
    )

    container.appendChild(component)

    updateAddButtonState(orderForm)
  }

  async function loadRecommendation(orderForm) {
    if (!isCartPage()) {
      removeComponent()
      return
    }

    if (
      !orderForm ||
      !Array.isArray(orderForm.items) ||
      !orderForm.items.length
    ) {
      removeComponent()
      return
    }

    const firstItem = orderForm.items[0]
    const firstProductId = String(firstItem.productId)

    if (
      currentProductId === firstProductId &&
      document.getElementById(COMPONENT_ID)
    ) {
      updateAddButtonState(orderForm)
      return
    }

    if (isLoading) {
      return
    }

    isLoading = true
    currentProductId = firstProductId

    const endpoint =
      `/api/catalog_system/pub/products/crossselling/` +
      `whosawalsosaw/${firstProductId}`

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(
          `Cross-selling request failed: ${response.status}`
        )
      }

      const products = await response.json()

      const recommendation = selectRecommendation(
        products,
        orderForm
      )

      if (!recommendation) {
        removeComponent()
        return
      }

      createComponent(recommendation, orderForm)
    } catch (_error) {
      removeComponent()
    } finally {
      isLoading = false
    }
  }

  function requestOrderForm() {
    if (
      !window.vtexjs ||
      !window.vtexjs.checkout ||
      typeof window.vtexjs.checkout.getOrderForm !== 'function'
    ) {
      return
    }

    window.vtexjs.checkout
      .getOrderForm()
      .done(function getOrderFormSuccess(orderForm) {
        loadRecommendation(orderForm)
      })
  }

  function bindEvents() {
    if (window.jQuery) {
      window.jQuery(window)
        .off('orderFormUpdated.vtex.checkoutCrossSelling')
        .on(
          'orderFormUpdated.vtex.checkoutCrossSelling',
          function handleOrderFormUpdated(_event, orderForm) {
            loadRecommendation(orderForm)
          }
        )
    }

    window.addEventListener('hashchange', function handleHashChange() {
      currentProductId = null

      if (!isCartPage()) {
        removeComponent()
        return
      }

      window.setTimeout(requestOrderForm, 300)
    })
  }

  function initialize() {
    if (
      !window.vtexjs ||
      !window.vtexjs.checkout ||
      typeof window.vtexjs.checkout.getOrderForm !== 'function'
    ) {
      window.setTimeout(initialize, 500)
      return
    }

    bindEvents()
    requestOrderForm()
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize)
  } else {
    initialize()
  }
})()