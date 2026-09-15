jQuery(document).ready(function () {
    var fme_efw_enquiry_button_location =
        fme_efw_blocks_settings?.fme_efw_general_settings
            ?.fme_efw_enquiry_button_location || "all_page";

    var fme_efw_enable_cart_enquiry =
        fme_efw_blocks_settings?.fme_efw_general_settings
            ?.fme_efw_enable_cart_enquiry || "0";

    var current_user = fme_efw_blocks_settings?.current_user ?? [];

    var current_user_roles = fme_efw_blocks_settings?.current_user_roles || [];

    // check if user is valid to show enquiry button
    var userRoles = fme_efw_blocks_settings?.fme_efw_general_settings?.fme_efw_show_enquiry_button_to_users?.split(',') || [];

    var cart_items_shipping_classes = fme_efw_blocks_settings?.cart_items_shipping_classes ?? [];
    var cart_products = fme_efw_blocks_settings?.cart_products ?? [];

    if (window.wc && window.wc.blocksCheckout) {
        const { registerCheckoutFilters } = window.wc.blocksCheckout;

        const { select, subscribe } = window.wp.data;
        const cartStoreKey = window.wc.wcBlocksData.CART_STORE_KEY;
        const unsub = subscribe(onCartChange, cartStoreKey);

        function onCartChange() {
            const cartData = select(cartStoreKey).getCartData();
            if (1 == fme_efw_enable_cart_enquiry) {
                fme_inject_inquiry_button(cartData);
            }
        }

        // check if we have the cart enquiry on then add enquiry button after cart items
        if (1 == fme_efw_enable_cart_enquiry) {
            let data = select(cartStoreKey).getCartData();
            setTimeout(() => {
                fme_inject_inquiry_button(data);
            }, 500);
        }

        const modifyCartItemName = (defaultValue, extensions, args) => {
            const isCartContext = args?.context === "cart";

            if (!isCartContext) {
                return defaultValue;
            }

            let isUserValid = fme_efw_check_user_role_validation(userRoles, current_user, current_user_roles);

            let product_id = args?.cartItem?.id;
            
            let display_btn = fme_efw_get_product_validation(
                "cart",
                product_id
            );

            let btn_html = fme_efw_enquiry_button(
                product_id,
                args.cartItem.permalink,
                args.cartItem.quantity
            );

            if (isUserValid && display_btn && undefined !== btn_html) {
                // Create a new span element with additional content
                return defaultValue + "<br/>" + btn_html;
            } else {
                return defaultValue;
            }
        };

        if (
            fme_efw_enquiry_button_location == "all_page" ||
            fme_efw_enquiry_button_location == "cart_page"
        ) {
            registerCheckoutFilters("fme-enquiry-item-name", {
                itemName: modifyCartItemName,
            });

            // used this because by default the item name was not getting changed, and it was only getting changed when the quantity was changed, so I just clicked on plus and minus button using code, quantity is not changed but the item name is modified and our enquiry button appears.
            setTimeout(() => {
                jQuery(document)
                    .find(
                        ".wc-block-components-quantity-selector__button--plus"
                    )
                    .click();
                jQuery(document)
                    .find(
                        ".wc-block-components-quantity-selector__button--minus"
                    )
                    .click();
            }, 100);
        }

        // checkout page compatibility
        // inject enquiry button on checkout page
        const modifyItemNameSummary = (defaultValue, extensions, args) => {
            const isCartContext = args?.context === "summary";
            if (!isCartContext) {
                return defaultValue;
            }

            let isUserValid = fme_efw_check_user_role_validation(userRoles, current_user, current_user_roles);
            let product_id = args?.cartItem?.id;

            let display_btn = fme_efw_get_product_validation(
                "checkout",
                product_id
            );
            let btn_html = fme_efw_enquiry_button(
                product_id,
                args.cartItem.permalink,
                args.cartItem.quantity
            );
            if (isUserValid && display_btn && undefined !== btn_html) {
                // Create a new span element with additional content
                return defaultValue + "<br/>" + btn_html;
            } else {
                return defaultValue;
            }
        };

        if (fme_efw_enquiry_button_location == "all_page") {
            registerCheckoutFilters("modify-summary-cart-name", {
                itemName: modifyItemNameSummary,
            });
        }

        /**
         * Function to inject enquiry button after cart items
         *
         * @param {mixed} data
         */
        function fme_inject_inquiry_button(data) {
            let isUserValid = fme_efw_check_user_role_validation(userRoles, current_user, current_user_roles);
            if (!isUserValid) {
                return;
            }
            var fme_efw_button = fme_efw_cart_enquiry_button(data);
            if (jQuery(".fme-cart-enquiry-button").length < 1) {
                jQuery(
                    ".wp-block-woocommerce-cart-line-items-block tbody"
                ).append(
                    `<tr><td colspan='100%'><div class='fme-cart-enquiry-button'></div><td></tr>`
                );
            }

            // add cart enquiry button after cart items block
            jQuery(".fme-cart-enquiry-button")
                .css({ display: "block" })
                .html(fme_efw_button);
        }
    }

    /**
     * Function to return enquiry button html
     *
     *
     * @returns string html for enquiry button
     */

    function fme_efw_cart_enquiry_button(data) {
        let button_code = fme_efw_blocks_settings.rendered_button;

        var cart_product_details = ``;
        var product_id = [];
        var product_Quantities = [];
        var product_link = "";

        data.items.forEach((item, index) => {
            product_id.push(item.id);
            product_Quantities.push(item.quantity);
            product_link += " \n " + encodeURI(item.permalink);
            cart_product_details += `${item.quantity} x ${item.name} (ID: ${item.id} SKU: ${item.sku}) <br/>`;

        });

        product_link.trim("+");

        // Create a temporary container element to hold the HTML
        var container = document.createElement("div");
        container.innerHTML = button_code;
        // Update data-product-id and data-product-link attributes
        var buttonElement = container.querySelector("#fme_efw_enquire_now_btn");
        if (buttonElement) {
            var p_ids = product_id.toString();
            var product_Qty = product_Quantities.toString();

            buttonElement.setAttribute("data-product-id", p_ids); // Replace '123' with the desired value
            buttonElement.setAttribute("data-product-quantites", product_Qty); // Replace '123' with the desired value
            buttonElement.setAttribute(
                "data-product-link",
                encodeURIComponent(product_link)
            ); // Replace 'http://example.com' with the desired value
            buttonElement.setAttribute(
                "data-cart-products",
                cart_product_details
            ); // Replace
        }

        // Create a new span element with additional content
        return container.innerHTML;
    }

    /**
     * Function to return cart enquiry button html
     * @param {*} product_id
     * @param {*} product_link
     * @returns string html for cart enquiry button
     */

    function fme_efw_enquiry_button(product_id, product_link, prodQuantity) {

        let isUserValid = fme_efw_check_user_role_validation(userRoles, current_user, current_user_roles);

        if (!isUserValid) {
            return;
        }
        let button_code = fme_efw_blocks_settings.rendered_button;

        // Create a temporary container element to hold the HTML
        var container = document.createElement("div");
        container.innerHTML = button_code;

        // Update data-product-id and data-product-link attributes
        var buttonElement = container.querySelector("#fme_efw_enquire_now_btn");
        if (buttonElement) {
            buttonElement.setAttribute("data-product-id", product_id); // Replace '123' with the desired value
            buttonElement.setAttribute("data-product-quantites", prodQuantity); // Replace '123' with the desired value
            buttonElement.setAttribute("data-product-link", product_link); // Replace 'http://example.com' with the desired value
        }

        // Create a new span element with additional content
        return container.innerHTML;
    }

    /**
     * Function to validate enquiry button rendering
     *
     * This function returns true or false based on some validations, and then based on return value, enquiry button is rendered or not.
     *
     * @param {string} page
     * @param {int} product_id
     *
     * @returns {boolean} true|false
     */
    function fme_efw_get_product_validation(page, product_id) {
        var product = fme_efw_blocks_settings.cart_products[product_id];

        // console.log('product for validation', product);

        var productValidations = false;

        var fme_efw_show_on_products =
            fme_efw_blocks_settings?.fme_efw_general_settings
                ?.fme_efw_show_on_products || "";
        var fme_efw_include_or_exclude =
            fme_efw_blocks_settings?.fme_efw_general_settings
                ?.fme_efw_include_or_exclude || "";
        var fme_efw_exclude_by =
            fme_efw_blocks_settings?.fme_efw_general_settings
                ?.fme_efw_exclude_by || "";
        var fme_efw_include_by =
            fme_efw_blocks_settings?.fme_efw_general_settings
                ?.fme_efw_include_by || "";

        var fme_efw_show_on_outofstock =
            fme_efw_blocks_settings?.fme_efw_general_settings
                ?.fme_efw_show_on_outofstock || "";

        var fme_efw_exclude_these_products =
            fme_efw_blocks_settings?.fme_efw_general_settings
                ?.fme_efw_exclude_these_products || [];
        var fme_efw_exclude_cats_select =
            fme_efw_blocks_settings?.fme_efw_general_settings
                ?.fme_efw_exclude_cats_select || [];

        var fme_efw_include_these_products =
            fme_efw_blocks_settings?.fme_efw_general_settings
                ?.fme_efw_include_these_products || [];
        var fme_efw_include_cats_select =
            fme_efw_blocks_settings?.fme_efw_general_settings
                ?.fme_efw_include_cats_select || [];

        var fme_efw_selected_shipping_classes =
            fme_efw_blocks_settings?.fme_efw_general_settings
                ?.fme_efw_selected_shipping_classes || [];


        // convert product_id to string, as when checking if the product id exists in products array, gives type error, product id and each elements array should be of same data type, i-e string
        product_id = product_id ? product_id.toString() : "";

        if (fme_efw_show_on_products === "all") {
            productValidations = true;
        } else if (
            fme_efw_show_on_products === "specific" &&
            fme_efw_include_or_exclude === "exclude" &&
            fme_efw_exclude_by === "fme_efw_products"
        ) {
            // check if current product exists in exclude products array
            productValidations =
                !fme_efw_exclude_these_products.includes(product_id);
        } else if (
            fme_efw_show_on_products === "specific" &&
            fme_efw_include_or_exclude === "exclude" &&
            fme_efw_exclude_by === "fme_efw_categories"
        ) {
            // check if current product category exists in exclude categories array
            var currentProductCategoryIds = product
                ? product?.category_ids
                : []; // Assuming product.category_ids is defined elsewhere
            productValidations = !currentProductCategoryIds.some(categoryId =>
                fme_efw_exclude_cats_select.includes(categoryId.toString())
            );
        } else if (
            fme_efw_show_on_products === "specific" &&
            fme_efw_include_or_exclude === "include" &&
            fme_efw_include_by === "fme_efw_products"
        ) {

            if (!fme_efw_include_these_products || fme_efw_include_these_products.length === 0) {
                return true; // or continue to skip this iteration if inside a loop
            }
            // check if current product exists in include product array
            productValidations =
                fme_efw_include_these_products.includes(product_id);
        } else if (
            fme_efw_show_on_products === "specific" &&
            fme_efw_include_or_exclude === "include" &&
            fme_efw_include_by === "fme_efw_categories"
        ) {

            if (!fme_efw_include_cats_select || fme_efw_include_cats_select.length === 0) {
                return true; // or continue to skip this iteration if inside a loop
            }
            // check if current product category exists in include categories array
            var currentProductCategoryIds = product
                ? product?.category_ids
                : []; // Assuming product.category_ids is defined elsewhere
            productValidations = currentProductCategoryIds.some(categoryId =>
                fme_efw_include_cats_select.includes(categoryId.toString())
            );
        } else if (
            fme_efw_show_on_products === "specific" &&
            fme_efw_include_or_exclude === "include" &&
            fme_efw_exclude_by === "fme_efw_shipping_classes"
        ) {
            if (!fme_efw_selected_shipping_classes || fme_efw_selected_shipping_classes.length === 0) {
                return true; // or continue to skip this iteration if inside a loop
            }
            cart_items_shipping_classes.forEach(cart_items_shipping_classes => {
                var productId = cart_items_shipping_classes.product_id;
                var variationId = cart_items_shipping_classes.variation_id;
                var shippingClass = cart_items_shipping_classes.shipping_class;

                if ('' == shippingClass) return true;

                if (product_id == productId || product_id == variationId) {
                    // check if current shipping class exists in include shipping class array
                    productValidations = fme_efw_selected_shipping_classes.includes(shippingClass);
                }
            });
        } else if (
            fme_efw_show_on_products === "specific" &&
            fme_efw_include_or_exclude === "exclude" &&
            fme_efw_exclude_by === "fme_efw_shipping_classes"
        ) {
            cart_items_shipping_classes.forEach(cart_items_shipping_classes => {
                var productId = cart_items_shipping_classes.product_id;
                var variationId = cart_items_shipping_classes.variation_id;
                var shippingClass = cart_items_shipping_classes.shipping_class;

                if (product_id == productId || product_id == variationId) {
                    // check if current shipping class does not exists in exclude shipping class array
                    productValidations = !fme_efw_selected_shipping_classes.includes(shippingClass);
                }
            });
        }

        // check if enquiry button is displayed on all products, only out of stock or except out of stock products
        if (productValidations) {
            if (fme_efw_show_on_outofstock === "all") {
                productValidations = true;
            } else if (fme_efw_show_on_outofstock === "only") {
                // show only on out of stock products
                productValidations = product.stock_status != "stock_status";
            } else if (fme_efw_show_on_outofstock === "except") {
                // show only on in stock products
                productValidations = product.stock_status == "stock_status";
            }
        }

        return productValidations;
    }

    function fme_efw_check_user_role_validation(userRoles, current_user, current_user_roles) {
        let isUserValid = true;
        const possibleUserRoles = [
            'all',
            'logged-in-users',
            'guest-users',
            'administrator',
            'editor',
            'author',
            'contributor',
            'subscriber',
            'customer',
            'shop_manager',
            'translator',
            'organizer'
        ];

        // const current_user = window?.fme_efw_current_user || { ID: 0, roles: [] };
        // const current_user_roles = current_user.roles;
        if (userRoles.length) {
            if (!userRoles.includes('all')) {
                if (current_user.ID === 0 && !userRoles.includes('guest-users')) {
                    isUserValid = false;
                } else if (current_user.ID !== 0) {
                    if (!userRoles.includes('logged-in-users')) {
                        const user_role_match = current_user_roles.filter(role => userRoles.includes(role));
                        if (!user_role_match.length) {
                            isUserValid = false;
                        }
                    }
                }
            }
        }
        return isUserValid;
    }

});


