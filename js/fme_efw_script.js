class FME_EFW_Front {
    FME_EFW_Form_Wrapper = ".fme_efw_form_layout_wrapper";
    FME_EFW_Form_Toggle_Button = ".fme_efw_enquire_now_btn_toggle";

    FME_EFW_Enquiry_Form = "#fme_efw_enquiry_form";
    FME_EFW_Enquiry_Form_Submit_Button = ".fme_efw_form_submit_button";

    FME_EFW_Enquiry_Form_Response = ".fme_efw_enquiry_form_response";

    FME_EFW_Required_Field_Class = ".fme-efw-required-field";
    FME_EFW_Required_Fields_Validated = 0;

    // constructor function
    constructor() {
        // add on change, blur event for required fields
        jQuery(document).on(
            "change blur",
            this.FME_EFW_Required_Field_Class,
            e => {
                this.fme_efw_validate_field(e.target);
            }
        );

        // when enquiry form is submitted from front end
        jQuery(document).on("submit", this.FME_EFW_Enquiry_Form, e => {
            e.preventDefault();

            this.fme_efw_check_required_fields();

            // count all none empty required fields
            let c = this.fme_efw_count_non_empty_required_fields();

            if (c[0] == c[1]) {
                this.fme_efw_submit_enquiry_form(e);
            }
        });

        // when enquire now button is clicked open or hide the form
        jQuery(document).on("click", this.FME_EFW_Form_Toggle_Button, e => {
            e.preventDefault();
            let product_id = jQuery(e.target).data("product-id");
            let product_qty = jQuery(e.target).data("product-quantites");
            let product_link = jQuery(e.target).data("product-link");
            let buttonLocation = jQuery(e.target).data("button-location");

            if (product_link && typeof product_link === "string") {
                if (buttonLocation == 1) {
                    product_link = encodeURIComponent(product_link);
                } else if (buttonLocation == 2) {
                    product_link = product_link.split(" ");
                    product_link = product_link
                        .map(link => encodeURIComponent(link))
                        .join("    ");
                }
            }

            ////////////////////////// ADDED BY M.Manahal //////////////////////////////
            // set specific product names to the end of enquiry form button
            let specific_products_name = jQuery(e.target).data("specific-products-name");

            if ("" != specific_products_name && undefined != specific_products_name) {
                jQuery(this.FME_EFW_Enquiry_Form_Response).before(`
                    <div class="fme_efw_form_group fme_efw_specific_products_details" style="display: none;">
                    <input type='hidden' name='fme_specific_product_names' value='${specific_products_name}'>
                    </div>`);
            } else {
                jQuery(".fme_efw_specific_products_details").remove();
            }
            let specific_products_skus = jQuery(e.target).data("specific-products-skus");

            if ("" != specific_products_skus && undefined != specific_products_skus) {
                jQuery(this.FME_EFW_Enquiry_Form_Response).before(`
                    <div class="fme_efw_form_group fme_efw_specific_products_details" style="display: none;">
                    <input type='hidden' name='fme_specific_product_skus' value='${specific_products_skus}'>
                    </div>`);
            }
            ////////////////////////// ADDED BY M.Manahal //////////////////////////////

            ////////////////////////// ADDED BY SAQIB //////////////////////////////
            let cart_products = jQuery(e.target).data("cart-products");

            if ("" != cart_products && undefined != cart_products) {
                if (jQuery(".fme_efw_cart_products_details").length) {
                    jQuery(".fme_efw_cart_products_details").html(`
                    ${cart_products}
                    <input type='hidden' name='fme_efw_cart_enquiry_products' value='${cart_products}'>
                    `);
                } else {
                    jQuery(this.FME_EFW_Enquiry_Form_Response).before(`
                        <div class="fme_efw_form_group fme_efw_cart_products_details">
                        ${cart_products}
                        <input type='hidden' name='fme_efw_cart_enquiry_products' value='${cart_products}'>
                        </div>`);
                }
            } else {
                jQuery(".fme_efw_cart_products_details").remove();
            }
            ////////////////////////// ADDED BY SAQIB //////////////////////////////

            if (
                !jQuery(this.FME_EFW_Form_Wrapper).hasClass(
                    "fme_efw_form_layout_wrapper_active"
                )
            ) {
                // set product link to the end of whatsapp link
                jQuery(".fme_efw_whatsapp_contact_button").each(function (
                    index,
                    elem
                ) {
                    let btn_link = jQuery(elem).data("btn-link");
                    btn_link = btn_link + " " + product_link;
                    jQuery(elem).attr("href", btn_link);
                });

                // set product link to the end of sms link
                jQuery(".fme_efw_sms_contact_button").each(function (
                    index,
                    elem
                ) {
                    let btn_link = jQuery(elem).data("btn-link");
                    btn_link = btn_link + " " + product_link;
                    jQuery(elem).attr("href", btn_link);
                });
            }

            this.fme_efw_reset_enquiry_form();
            jQuery("#enquiry_product_id").val(product_id);
            jQuery("#enquiry_product_quantites").val(product_qty);
            this.fme_toggle_enquiry_form(); // open or close enquiry form
        });

        jQuery(document).on("click", ".fme_efw_form_tab_tablinks", e => {
            let tabName = jQuery(e.target).data("open");
            this.fme_efw_change_tab(e, tabName);
        });


        // on change of quantity  - also change enquiry quantity
        jQuery('[name="quantity"]').on('change', function() {
            var quantity = jQuery(this).val();
            // var fme_efw_enquire_now_btn = jQuery(this).closest('#fme_efw_enquire_now_btn');
            var fme_efw_enquire_now_btn = jQuery(this).closest('form').find('#fme_efw_enquire_now_btn');
            if(fme_efw_enquire_now_btn.length ==  0){
                fme_efw_enquire_now_btn = jQuery('#fme_efw_enquire_now_btn');
            }
            fme_efw_enquire_now_btn.attr('data-product-quantites', quantity);
        });

        // on show variation  - also change enquiry quantity
        jQuery('form.cart').on('show_variation', function(event, variation) {
            var quantity = jQuery('[name="quantity"]').val();
            var fme_efw_enquire_now_btn = jQuery(this).closest('form').find('#fme_efw_enquire_now_btn');
             if(fme_efw_enquire_now_btn.length ==  0){
                fme_efw_enquire_now_btn = jQuery('#fme_efw_enquire_now_btn');
            }
            fme_efw_enquire_now_btn.attr('data-product-quantites', quantity);

        });
    } // end of constructor function

    fme_efw_reset_enquiry_form() {
        jQuery(this.FME_EFW_Enquiry_Form).trigger("reset");
    }

    fme_efw_reset_enquiry_form_response_message() {
        jQuery(this.FME_EFW_Enquiry_Form_Response)
            .removeClass("fme_efw_alert_success")
            .removeClass("fme_efw_alert_error")
            .hide()
            .empty();
    }

    /**
     * Function responsible for submitting the form
     */
    fme_efw_submit_enquiry_form(e) {
        let form_data = new FormData(e.target);
        form_data.append("action", "fme_efw_front_submit_enquiry_form");
        form_data.append("security", fme_efw_front_data.front_ajax_nonce);
        let orignal_btn_text = jQuery(
            this.FME_EFW_Enquiry_Form_Submit_Button
        ).html();
        jQuery(this.FME_EFW_Enquiry_Form_Submit_Button)
            .html("Processing...")
            .attr("disabled", true);

        jQuery
            .ajax({
                url: fme_efw_front_data.admin_url,
                type: "POST",
                data: form_data,
                cache: false,
                contentType: false,
                processData: false,
            })
            .then(res => {
                let d = jQuery.parseJSON(res);
                if (d.status == 1) {
                    jQuery(this.FME_EFW_Enquiry_Form_Response)
                        .removeClass("fme_efw_alert_error")
                        .addClass("fme_efw_alert_success")
                        .show()
                        .html(d.message);
                    this.fme_efw_reset_enquiry_form();
                    setTimeout(() => {
                        this.fme_efw_reset_enquiry_form_response_message();
                    }, 1000);
                    setTimeout(() => {
                        this.fme_toggle_enquiry_form(); // open or close enquiry form
                    }, 1500);
                    // if url is not empty then redirect to url
                    if (d.redirect_url.trim() != "") {
                        window.location.href = d.redirect_url;
                    }
                } else {
                    jQuery(this.FME_EFW_Enquiry_Form_Response)
                        .removeClass("fme_efw_alert_success")
                        .addClass("fme_efw_alert_error")
                        .show()
                        .html(d.message);
                }
                jQuery(this.FME_EFW_Enquiry_Form_Submit_Button)
                    .html(orignal_btn_text)
                    .attr("disabled", false);
            })
            .catch(err => {
                jQuery(this.FME_EFW_Enquiry_Form_Submit_Button)
                    .html(orignal_btn_text)
                    .attr("disabled", false);
                console.log(err);
            });
    }

    /**
     * Function to toggle enquiry form - open or close the enquiry form
     */
    fme_toggle_enquiry_form() {
        jQuery(this.FME_EFW_Form_Wrapper).toggleClass(
            "fme_efw_form_layout_wrapper_active"
        );
    }

    /**
     * Function responsible for toggling the tabs in enquiry form at front-end
     */
    fme_efw_change_tab(e, tabName) {
        // Declare all variables
        var tabcontent, tablinks;

        // Get all elements with class="tabcontent" and hide them
        tabcontent = jQuery(".fme_efw_form_tab_tabcontent");
        tabcontent.removeClass("fme_efw_form_tab_tabcontent_active");

        // Get all elements with class="tablinks" and remove the class "active"
        tablinks = jQuery(".fme_efw_form_tab_tablinks");
        tablinks.removeClass("active");

        // Show the current tab, and add an "active" class to the button that opened the tab
        jQuery("#" + tabName).addClass("fme_efw_form_tab_tabcontent_active");
        jQuery(e.target).addClass("active");
    }

    /**
     * Function responsible for checking required fields
     */
    fme_efw_check_required_fields() {
        this.FME_EFW_Required_Fields_Validated = 0;
        // get all required fields
        jQuery(this.FME_EFW_Required_Field_Class).each((index, field) => {
            this.fme_efw_validate_field(field);
        });
    }

    /**
     * Function responsible for validating each individual field
     */
    fme_efw_validate_field(field) {
        let field_value = jQuery(field).val();
        let field_name = jQuery(field).attr("name");
        let field_type = jQuery(field).attr("type");
        field_name = field_name.replace("[]", "");
        // check if field type is radio or checkbox then get the checked value
        if (undefined != field_type && field_type.trim() == "checkbox") {
            if (
                jQuery('input[name="' + field_name + '[]"]:checked').length > 0
            ) {
                field_value = jQuery(
                    'input[name="' + field_name + '[]"]:checked'
                ).serialize();
                jQuery("." + field_name + "-help-message")
                    .css({ color: "black" })
                    .empty();
                this.FME_EFW_Required_Fields_Validated -= 1;
            } else {
                this.FME_EFW_Required_Fields_Validated += 1;
                jQuery("." + field_name + "-help-message")
                    .css({ color: "red" })
                    .html("This field is required!");
                jQuery(field).css({ border: "1px solid red" });
            }
        } else if (undefined != field_type && field_type.trim() == "radio") {
            if (jQuery('input[name="' + field_name + '"]:checked').length > 0) {
                field_value = jQuery(
                    'input[name="' + field_name + '"]:checked'
                ).val();
                jQuery("." + field_name + "-help-message")
                    .css({ color: "black" })
                    .empty();
                this.FME_EFW_Required_Fields_Validated -= 1;
            } else {
                this.FME_EFW_Required_Fields_Validated += 1;
                jQuery("." + field_name + "-help-message")
                    .css({ color: "red" })
                    .html("This field is required!");
                jQuery(field).css({ border: "1px solid red" });
            }
        } else {
            if (field_value.trim() == "" || field_value.length < 1) {
                this.FME_EFW_Required_Fields_Validated += 1;
                jQuery("." + field_name + "-help-message")
                    .css({ color: "red" })
                    .html("This field is required!");
                jQuery(field).css({ border: "1px solid red" });
            } else {
                this.FME_EFW_Required_Fields_Validated -= 1;
                jQuery("." + field_name + "-help-message")
                    .css({ color: "black" })
                    .empty();
                jQuery(field).css({ border: "none" });
            }
        }
    }

    /**
     * Count the none empty required fields
     */
    fme_efw_count_non_empty_required_fields() {
        var count = 0;
        var field_count = 0;
        var already_checked = [];

        jQuery(".fme-efw-required-field").each(function (i, e) {
            let field_name = jQuery(e).attr("name");
            let field_type = jQuery(e).attr("type");

            if (field_type == "checkbox" || field_type == "radio") {
                if (
                    already_checked.findIndex((el, index) => el == field_name) <
                    0
                ) {
                    if (
                        jQuery('input[name="' + field_name + '[]"]:checked')
                            .length > 0 ||
                        jQuery('input[name="' + field_name + '"]:checked')
                            .length > 0
                    ) {
                        count++;
                    }
                    already_checked.push(field_name);
                    field_count++;
                }
            } else {
                let v = jQuery(e).val();
                if (v.trim() != "") {
                    count++;
                }
                field_count++;
            }
        });
        return [field_count, count];
    }
} // end of class

// initialize the object of FME_EFW_Front
new FME_EFW_Front();
