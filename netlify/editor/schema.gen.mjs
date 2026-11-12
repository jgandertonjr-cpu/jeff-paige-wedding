// Generated from src/admin/config.yml by `npm run schema`. Do not edit by hand.
export default {
  "files": {
    "site": {
      "path": "src/_data/site.json",
      "label": "Names, Date & Venue",
      "fields": [
        {
          "name": "couple",
          "label": "The couple",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "partner1_first",
              "label": "First partner — first name",
              "type": "string",
              "required": true
            },
            {
              "name": "partner1_full",
              "label": "First partner — full name",
              "type": "string",
              "required": true
            },
            {
              "name": "partner1_formal",
              "label": "First partner — formal name",
              "type": "string",
              "required": false
            },
            {
              "name": "partner2_first",
              "label": "Second partner — first name",
              "type": "string",
              "required": true
            },
            {
              "name": "partner2_full",
              "label": "Second partner — full name",
              "type": "string",
              "required": true
            },
            {
              "name": "partner2_formal",
              "label": "Second partner — formal name",
              "type": "string",
              "required": false
            }
          ]
        },
        {
          "name": "wedding_date",
          "label": "Wedding date",
          "type": "date",
          "required": true
        },
        {
          "name": "venue",
          "label": "Venue",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "name",
              "label": "Venue name",
              "type": "string",
              "required": true
            },
            {
              "name": "street",
              "label": "Street address",
              "type": "string",
              "required": true
            },
            {
              "name": "city",
              "label": "City",
              "type": "string",
              "required": true
            },
            {
              "name": "state",
              "label": "State",
              "type": "string",
              "required": true
            },
            {
              "name": "zip",
              "label": "ZIP code",
              "type": "string",
              "required": true
            }
          ]
        },
        {
          "name": "calendar",
          "label": "Calendar event",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "title",
              "label": "Event title",
              "type": "string",
              "required": true
            },
            {
              "name": "start_time",
              "label": "Start time (Eastern)",
              "type": "time",
              "required": false
            },
            {
              "name": "end_time",
              "label": "End time (Eastern)",
              "type": "time",
              "required": false
            },
            {
              "name": "description",
              "label": "Note in the event",
              "type": "text",
              "required": true
            }
          ]
        },
        {
          "name": "email",
          "label": "Contact email",
          "type": "string",
          "required": true,
          "pattern": "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
          "patternMessage": "Enter an email address like name@example.com"
        },
        {
          "name": "footer_text",
          "label": "Footer text",
          "type": "string",
          "required": true
        },
        {
          "name": "labels",
          "label": "Button & label wording",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "get_directions",
              "label": "Link: Get directions",
              "type": "string",
              "required": true
            },
            {
              "name": "show_map",
              "label": "Map button: Show map",
              "type": "string",
              "required": true
            },
            {
              "name": "opens_in_new_tab",
              "label": "Hidden note for screen readers on links that open a new tab",
              "type": "string",
              "required": true
            },
            {
              "name": "add_to_calendar",
              "label": "Button: Add to Calendar",
              "type": "string",
              "required": true
            },
            {
              "name": "apple_calendar",
              "label": "Calendar choice: Apple",
              "type": "string",
              "required": true
            },
            {
              "name": "apple_calendar_hint",
              "label": "Calendar choice: Apple, small text",
              "type": "string",
              "required": true
            },
            {
              "name": "google_calendar",
              "label": "Calendar choice: Google",
              "type": "string",
              "required": true
            },
            {
              "name": "google_calendar_hint",
              "label": "Calendar choice: Google, small text",
              "type": "string",
              "required": true
            },
            {
              "name": "outlook",
              "label": "Calendar choice: Outlook",
              "type": "string",
              "required": true
            },
            {
              "name": "outlook_hint",
              "label": "Calendar choice: Outlook, small text",
              "type": "string",
              "required": true
            },
            {
              "name": "other_calendar",
              "label": "Calendar choice: Other",
              "type": "string",
              "required": true
            },
            {
              "name": "other_calendar_hint",
              "label": "Calendar choice: Other, small text",
              "type": "string",
              "required": true
            }
          ]
        }
      ]
    },
    "theme": {
      "path": "src/_data/theme.json",
      "label": "Colours",
      "fields": [
        {
          "name": "dusty_sage",
          "label": "Banner green",
          "type": "string",
          "required": true,
          "pattern": "^#[0-9A-Fa-f]{6}$",
          "patternMessage": "Enter a colour like #BCCAB3"
        },
        {
          "name": "rosette",
          "label": "RSVP pink",
          "type": "string",
          "required": true,
          "pattern": "^#[0-9A-Fa-f]{6}$",
          "patternMessage": "Enter a colour like #BCCAB3"
        },
        {
          "name": "gold",
          "label": "Gold",
          "type": "string",
          "required": true,
          "pattern": "^#[0-9A-Fa-f]{6}$",
          "patternMessage": "Enter a colour like #BCCAB3"
        },
        {
          "name": "ivory",
          "label": "Page background",
          "type": "string",
          "required": true,
          "pattern": "^#[0-9A-Fa-f]{6}$",
          "patternMessage": "Enter a colour like #BCCAB3"
        },
        {
          "name": "sage_mist",
          "label": "Alternate section background",
          "type": "string",
          "required": true,
          "pattern": "^#[0-9A-Fa-f]{6}$",
          "patternMessage": "Enter a colour like #BCCAB3"
        },
        {
          "name": "white",
          "label": "Card white",
          "type": "string",
          "required": true,
          "pattern": "^#[0-9A-Fa-f]{6}$",
          "patternMessage": "Enter a colour like #BCCAB3"
        },
        {
          "name": "hairline",
          "label": "Thin lines",
          "type": "string",
          "required": true,
          "pattern": "^#[0-9A-Fa-f]{6}$",
          "patternMessage": "Enter a colour like #BCCAB3"
        },
        {
          "name": "blush",
          "label": "Soft pink",
          "type": "string",
          "required": true,
          "pattern": "^#[0-9A-Fa-f]{6}$",
          "patternMessage": "Enter a colour like #BCCAB3"
        },
        {
          "name": "evergreen",
          "label": "Main text",
          "type": "string",
          "required": true,
          "pattern": "^#[0-9A-Fa-f]{6}$",
          "patternMessage": "Enter a colour like #BCCAB3"
        },
        {
          "name": "sage_gray",
          "label": "Quiet text",
          "type": "string",
          "required": true,
          "pattern": "^#[0-9A-Fa-f]{6}$",
          "patternMessage": "Enter a colour like #BCCAB3"
        },
        {
          "name": "deep_gold",
          "label": "Gold text",
          "type": "string",
          "required": true,
          "pattern": "^#[0-9A-Fa-f]{6}$",
          "patternMessage": "Enter a colour like #BCCAB3"
        },
        {
          "name": "deep_evergreen",
          "label": "Text on banners",
          "type": "string",
          "required": true,
          "pattern": "^#[0-9A-Fa-f]{6}$",
          "patternMessage": "Enter a colour like #BCCAB3"
        },
        {
          "name": "muted_on_sage",
          "label": "Quiet text on banners",
          "type": "string",
          "required": true,
          "pattern": "^#[0-9A-Fa-f]{6}$",
          "patternMessage": "Enter a colour like #BCCAB3"
        },
        {
          "name": "gold_on_sage",
          "label": "Gold text on banners",
          "type": "string",
          "required": true,
          "pattern": "^#[0-9A-Fa-f]{6}$",
          "patternMessage": "Enter a colour like #BCCAB3"
        }
      ]
    },
    "nav": {
      "path": "src/_data/nav.json",
      "label": "Menu",
      "fields": [
        {
          "name": "essentials",
          "label": "Main menu links",
          "type": "list",
          "required": true,
          "fields": [
            {
              "name": "label",
              "label": "Link wording",
              "type": "string",
              "required": true
            },
            {
              "name": "url",
              "label": "Goes to",
              "type": "hidden",
              "required": true
            },
            {
              "name": "rsvp",
              "label": "RSVP style",
              "type": "hidden",
              "required": false
            }
          ]
        },
        {
          "name": "more",
          "label": "More links",
          "type": "list",
          "required": true,
          "fields": [
            {
              "name": "label",
              "label": "Link wording",
              "type": "string",
              "required": true
            },
            {
              "name": "url",
              "label": "Goes to",
              "type": "hidden",
              "required": true
            },
            {
              "name": "rsvp",
              "label": "RSVP style",
              "type": "hidden",
              "required": false
            }
          ]
        }
      ]
    },
    "home": {
      "path": "src/_data/home.json",
      "label": "Home",
      "fields": [
        {
          "name": "seo",
          "label": "Search & Sharing",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "title",
              "label": "Browser tab title",
              "type": "string",
              "required": true,
              "maxlength": 70
            },
            {
              "name": "description",
              "label": "Google description",
              "type": "text",
              "required": true,
              "maxlength": 160
            },
            {
              "name": "social_title",
              "label": "Link preview title",
              "type": "string",
              "required": false
            },
            {
              "name": "social_description",
              "label": "Link preview description",
              "type": "text",
              "required": false,
              "maxlength": 200
            }
          ]
        },
        {
          "name": "section_order",
          "label": "Order of sections",
          "type": "select",
          "required": true,
          "options": [
            "welcome",
            "countdown",
            "photos",
            "quick_links",
            "save_the_date"
          ],
          "multiple": true,
          "min": 5,
          "max": 5
        },
        {
          "name": "hero",
          "label": "Top of page",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "eyebrow",
              "label": "Small text above the photo",
              "type": "string",
              "required": true
            },
            {
              "name": "photo",
              "label": "Main photo",
              "type": "image",
              "required": true
            },
            {
              "name": "photo_alt",
              "label": "Photo description",
              "type": "string",
              "required": true
            }
          ]
        },
        {
          "name": "countdown",
          "label": "Countdown band",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "label",
              "label": "Small text",
              "type": "string",
              "required": true
            },
            {
              "name": "title",
              "label": "Heading",
              "type": "string",
              "required": true
            }
          ]
        },
        {
          "name": "welcome",
          "label": "Welcome section",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "label",
              "label": "Small text",
              "type": "string",
              "required": true
            },
            {
              "name": "title",
              "label": "Heading",
              "type": "string",
              "required": true
            },
            {
              "name": "text",
              "label": "Welcome message",
              "type": "text",
              "required": true
            }
          ]
        },
        {
          "name": "photos",
          "label": "Three photos",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "label",
              "label": "Small text",
              "type": "string",
              "required": true
            },
            {
              "name": "title",
              "label": "Heading",
              "type": "string",
              "required": true
            },
            {
              "name": "items",
              "label": "Photos",
              "type": "list",
              "required": true,
              "min": 3,
              "max": 3,
              "fields": [
                {
                  "name": "image",
                  "label": "Photo",
                  "type": "image",
                  "required": true
                },
                {
                  "name": "alt",
                  "label": "Photo description",
                  "type": "string",
                  "required": true
                },
                {
                  "name": "caption",
                  "label": "Caption",
                  "type": "string",
                  "required": true
                },
                {
                  "name": "focus",
                  "label": "Photo crop",
                  "type": "select",
                  "required": true,
                  "options": [
                    "center",
                    "high",
                    "left"
                  ]
                }
              ]
            }
          ]
        },
        {
          "name": "quick_links",
          "label": "\"Everything You Need to Know\" cards",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "label",
              "label": "Small text",
              "type": "string",
              "required": true
            },
            {
              "name": "title",
              "label": "Heading",
              "type": "string",
              "required": true
            },
            {
              "name": "our_story",
              "label": "Our Story card text",
              "type": "string",
              "required": true
            },
            {
              "name": "details",
              "label": "Details card text",
              "type": "string",
              "required": true
            },
            {
              "name": "rsvp",
              "label": "RSVP card text",
              "type": "string",
              "required": true
            },
            {
              "name": "wedding_party",
              "label": "Wedding Party card text",
              "type": "string",
              "required": true
            }
          ]
        },
        {
          "name": "save_the_date",
          "label": "Save the Date band",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "label",
              "label": "Small text",
              "type": "string",
              "required": true
            },
            {
              "name": "text",
              "label": "Message",
              "type": "text",
              "required": true
            }
          ]
        },
        {
          "name": "labels",
          "label": "Button & label wording",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "plan_your_trip",
              "label": "Button: Plan your trip",
              "type": "string",
              "required": true
            },
            {
              "name": "our_story",
              "label": "Button: Our story",
              "type": "string",
              "required": true
            },
            {
              "name": "days",
              "label": "Countdown word: Days",
              "type": "string",
              "required": true
            },
            {
              "name": "view_the_gallery",
              "label": "Button: View the gallery",
              "type": "string",
              "required": true
            },
            {
              "name": "card_our_story",
              "label": "Explore list: Our Story title",
              "type": "string",
              "required": true
            },
            {
              "name": "card_details",
              "label": "Explore list: Details title",
              "type": "string",
              "required": true
            },
            {
              "name": "card_rsvp",
              "label": "Explore list: RSVP title",
              "type": "string",
              "required": true
            },
            {
              "name": "card_wedding_party",
              "label": "Explore list: Wedding Party title",
              "type": "string",
              "required": true
            }
          ]
        }
      ]
    },
    "story": {
      "path": "src/_data/story.json",
      "label": "Our Story",
      "fields": [
        {
          "name": "seo",
          "label": "Search & Sharing",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "title",
              "label": "Browser tab title",
              "type": "string",
              "required": true,
              "maxlength": 70
            },
            {
              "name": "description",
              "label": "Google description",
              "type": "text",
              "required": true,
              "maxlength": 160
            },
            {
              "name": "social_title",
              "label": "Link preview title",
              "type": "string",
              "required": false
            },
            {
              "name": "social_description",
              "label": "Link preview description",
              "type": "text",
              "required": false,
              "maxlength": 200
            }
          ]
        },
        {
          "name": "hero",
          "label": "Top of page",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "label",
              "label": "Small text above the title",
              "type": "string",
              "required": true
            },
            {
              "name": "title",
              "label": "Page title",
              "type": "string",
              "required": true
            },
            {
              "name": "subtitle",
              "label": "Text under the title",
              "type": "text",
              "required": true
            }
          ]
        },
        {
          "name": "events",
          "label": "Timeline",
          "type": "list",
          "required": true,
          "fields": [
            {
              "name": "date_label",
              "label": "Date (as shown)",
              "type": "string",
              "required": true
            },
            {
              "name": "date_value",
              "label": "Date (for search engines)",
              "type": "string",
              "required": true,
              "pattern": "^\\d{4}(-\\d{2}(-\\d{2})?)?$",
              "patternMessage": "Use a format like 2022, 2022-11 or 2022-11-05"
            },
            {
              "name": "title",
              "label": "Title",
              "type": "string",
              "required": true
            },
            {
              "name": "story",
              "label": "Story",
              "type": "markdown",
              "required": true
            },
            {
              "name": "photo",
              "label": "Photo",
              "type": "image",
              "required": true
            },
            {
              "name": "photo_alt",
              "label": "Photo description",
              "type": "string",
              "required": true
            },
            {
              "name": "focus",
              "label": "Photo crop",
              "type": "select",
              "required": true,
              "options": [
                "center",
                "high",
                "left"
              ]
            }
          ]
        },
        {
          "name": "cta",
          "label": "Bottom section",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "label",
              "label": "Small text",
              "type": "string",
              "required": true
            },
            {
              "name": "title",
              "label": "Heading",
              "type": "string",
              "required": true
            },
            {
              "name": "text",
              "label": "Message",
              "type": "text",
              "required": true
            }
          ]
        },
        {
          "name": "labels",
          "label": "Button & label wording",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "view_details",
              "label": "Button: View details",
              "type": "string",
              "required": true
            }
          ]
        }
      ]
    },
    "details": {
      "path": "src/_data/details.json",
      "label": "Details (ceremony, reception, schedule)",
      "fields": [
        {
          "name": "seo",
          "label": "Search & Sharing",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "title",
              "label": "Browser tab title",
              "type": "string",
              "required": true,
              "maxlength": 70
            },
            {
              "name": "description",
              "label": "Google description",
              "type": "text",
              "required": true,
              "maxlength": 160
            },
            {
              "name": "social_title",
              "label": "Link preview title",
              "type": "string",
              "required": false
            },
            {
              "name": "social_description",
              "label": "Link preview description",
              "type": "text",
              "required": false,
              "maxlength": 200
            }
          ]
        },
        {
          "name": "hero",
          "label": "Top of page",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "label",
              "label": "Small text above the title",
              "type": "string",
              "required": true
            },
            {
              "name": "title",
              "label": "Page title",
              "type": "string",
              "required": true
            },
            {
              "name": "subtitle",
              "label": "Text under the title",
              "type": "text",
              "required": true
            }
          ]
        },
        {
          "name": "section_order",
          "label": "Order of sections",
          "type": "select",
          "required": true,
          "options": [
            "ceremony",
            "reception",
            "schedule",
            "cta"
          ],
          "multiple": true,
          "min": 4,
          "max": 4
        },
        {
          "name": "ceremony",
          "label": "Ceremony",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "title",
              "label": "Heading",
              "type": "string",
              "required": true
            },
            {
              "name": "box_heading",
              "label": "Box heading",
              "type": "string",
              "required": true
            },
            {
              "name": "items",
              "label": "Ceremony details",
              "type": "list",
              "required": true,
              "fields": [
                {
                  "name": "label",
                  "label": "Label",
                  "type": "string",
                  "required": true
                },
                {
                  "name": "value",
                  "label": "Value",
                  "type": "string",
                  "required": true
                },
                {
                  "name": "note",
                  "label": "Extra note",
                  "type": "text",
                  "required": false
                }
              ]
            }
          ]
        },
        {
          "name": "reception",
          "label": "Reception",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "label",
              "label": "Small text",
              "type": "string",
              "required": true
            },
            {
              "name": "title",
              "label": "Heading",
              "type": "string",
              "required": true
            },
            {
              "name": "subtitle",
              "label": "Intro text",
              "type": "text",
              "required": true
            },
            {
              "name": "box_heading",
              "label": "Box heading",
              "type": "string",
              "required": true
            },
            {
              "name": "items",
              "label": "Reception details",
              "type": "list",
              "required": true,
              "fields": [
                {
                  "name": "label",
                  "label": "Label",
                  "type": "string",
                  "required": true
                },
                {
                  "name": "value",
                  "label": "Value",
                  "type": "string",
                  "required": true
                },
                {
                  "name": "note",
                  "label": "Extra note",
                  "type": "text",
                  "required": false
                }
              ]
            }
          ]
        },
        {
          "name": "schedule",
          "label": "Schedule of the day",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "label",
              "label": "Small text",
              "type": "string",
              "required": true
            },
            {
              "name": "title",
              "label": "Heading",
              "type": "string",
              "required": true
            },
            {
              "name": "subtitle",
              "label": "Intro text",
              "type": "text",
              "required": false
            },
            {
              "name": "events",
              "label": "Events",
              "type": "list",
              "required": true,
              "fields": [
                {
                  "name": "time",
                  "label": "Time",
                  "type": "string",
                  "required": false
                },
                {
                  "name": "title",
                  "label": "Event",
                  "type": "string",
                  "required": true
                },
                {
                  "name": "description",
                  "label": "Description",
                  "type": "text",
                  "required": true
                }
              ]
            }
          ]
        },
        {
          "name": "cta",
          "label": "Bottom section",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "title",
              "label": "Heading",
              "type": "string",
              "required": true
            },
            {
              "name": "text",
              "label": "Message",
              "type": "text",
              "required": true
            }
          ]
        },
        {
          "name": "labels",
          "label": "Button & label wording",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "venue",
              "label": "Label: Venue",
              "type": "string",
              "required": true
            },
            {
              "name": "address",
              "label": "Label: Address",
              "type": "string",
              "required": true
            },
            {
              "name": "plan_your_trip",
              "label": "Button: Plan your trip",
              "type": "string",
              "required": true
            }
          ]
        }
      ]
    },
    "party": {
      "path": "src/_data/party.json",
      "label": "Wedding Party",
      "fields": [
        {
          "name": "seo",
          "label": "Search & Sharing",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "title",
              "label": "Browser tab title",
              "type": "string",
              "required": true,
              "maxlength": 70
            },
            {
              "name": "description",
              "label": "Google description",
              "type": "text",
              "required": true,
              "maxlength": 160
            },
            {
              "name": "social_title",
              "label": "Link preview title",
              "type": "string",
              "required": false
            },
            {
              "name": "social_description",
              "label": "Link preview description",
              "type": "text",
              "required": false,
              "maxlength": 200
            }
          ]
        },
        {
          "name": "hero",
          "label": "Top of page",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "label",
              "label": "Small text above the title",
              "type": "string",
              "required": true
            },
            {
              "name": "title",
              "label": "Page title",
              "type": "string",
              "required": true
            },
            {
              "name": "subtitle",
              "label": "Text under the title",
              "type": "text",
              "required": true
            }
          ]
        },
        {
          "name": "section_order",
          "label": "Order of sections",
          "type": "select",
          "required": true,
          "options": [
            "bridesmaids",
            "groomsmen",
            "cta"
          ],
          "multiple": true,
          "min": 3,
          "max": 3
        },
        {
          "name": "bridesmaids",
          "label": "Paige's side",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "label",
              "label": "Small text",
              "type": "string",
              "required": true
            },
            {
              "name": "title",
              "label": "Heading",
              "type": "string",
              "required": true
            },
            {
              "name": "members",
              "label": "People",
              "type": "list",
              "required": true,
              "fields": [
                {
                  "name": "name",
                  "label": "Name",
                  "type": "string",
                  "required": true
                },
                {
                  "name": "role",
                  "label": "Role",
                  "type": "string",
                  "required": true
                },
                {
                  "name": "bio",
                  "label": "Short bio",
                  "type": "text",
                  "required": true
                },
                {
                  "name": "photo",
                  "label": "Photo",
                  "type": "image",
                  "required": false
                }
              ]
            }
          ]
        },
        {
          "name": "groomsmen",
          "label": "Jeff's side",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "label",
              "label": "Small text",
              "type": "string",
              "required": true
            },
            {
              "name": "title",
              "label": "Heading",
              "type": "string",
              "required": true
            },
            {
              "name": "members",
              "label": "People",
              "type": "list",
              "required": true,
              "fields": [
                {
                  "name": "name",
                  "label": "Name",
                  "type": "string",
                  "required": true
                },
                {
                  "name": "role",
                  "label": "Role",
                  "type": "string",
                  "required": true
                },
                {
                  "name": "bio",
                  "label": "Short bio",
                  "type": "text",
                  "required": true
                },
                {
                  "name": "photo",
                  "label": "Photo",
                  "type": "image",
                  "required": false
                }
              ]
            }
          ]
        },
        {
          "name": "cta",
          "label": "Bottom section",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "title",
              "label": "Heading",
              "type": "string",
              "required": true
            },
            {
              "name": "text",
              "label": "Message",
              "type": "text",
              "required": true
            }
          ]
        },
        {
          "name": "labels",
          "label": "Button & label wording",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "see_the_details",
              "label": "Button: See the details",
              "type": "string",
              "required": true
            }
          ]
        }
      ]
    },
    "rsvp": {
      "path": "src/_data/rsvp.json",
      "label": "RSVP",
      "fields": [
        {
          "name": "seo",
          "label": "Search & Sharing",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "title",
              "label": "Browser tab title",
              "type": "string",
              "required": true,
              "maxlength": 70
            },
            {
              "name": "description",
              "label": "Google description",
              "type": "text",
              "required": true,
              "maxlength": 160
            },
            {
              "name": "social_title",
              "label": "Link preview title",
              "type": "string",
              "required": false
            },
            {
              "name": "social_description",
              "label": "Link preview description",
              "type": "text",
              "required": false,
              "maxlength": 200
            }
          ]
        },
        {
          "name": "hero",
          "label": "Top of page",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "label",
              "label": "Small text above the title",
              "type": "string",
              "required": true
            },
            {
              "name": "title",
              "label": "Page title",
              "type": "string",
              "required": true
            },
            {
              "name": "subtitle",
              "label": "Text under the title",
              "type": "text",
              "required": true
            }
          ]
        },
        {
          "name": "rsvp_open",
          "label": "RSVPs are open",
          "type": "boolean",
          "required": true
        },
        {
          "name": "deadline",
          "label": "Reply-by date",
          "type": "date",
          "required": false
        },
        {
          "name": "closed_notice",
          "label": "Message while RSVPs are closed",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "title",
              "label": "Heading",
              "type": "string",
              "required": true
            },
            {
              "name": "text",
              "label": "Message",
              "type": "text",
              "required": true
            }
          ]
        },
        {
          "name": "form_intro",
          "label": "Heading above the form",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "label",
              "label": "Small text",
              "type": "string",
              "required": true
            },
            {
              "name": "title",
              "label": "Heading",
              "type": "string",
              "required": true
            }
          ]
        },
        {
          "name": "meal_options",
          "label": "Meal choices",
          "type": "list",
          "required": true,
          "fields": [
            {
              "name": "label",
              "label": "Meal name (what guests see)",
              "type": "string",
              "required": true
            },
            {
              "name": "value",
              "label": "Short code (what you see in responses)",
              "type": "string",
              "required": true
            }
          ]
        },
        {
          "name": "extra_questions",
          "label": "Extra questions",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "afterparty_show",
              "label": "Ask about the after party",
              "type": "boolean",
              "required": true
            },
            {
              "name": "afterparty_label",
              "label": "After party question",
              "type": "string",
              "required": true
            },
            {
              "name": "wedding_song_show",
              "label": "Ask married guests for their wedding song",
              "type": "boolean",
              "required": true
            },
            {
              "name": "wedding_song_heading",
              "label": "Wedding song box heading",
              "type": "string",
              "required": true
            },
            {
              "name": "wedding_song_label",
              "label": "Wedding song field label",
              "type": "string",
              "required": true
            },
            {
              "name": "wedding_song_hint",
              "label": "Text under the wedding song heading",
              "type": "string",
              "required": false
            },
            {
              "name": "wedding_song_placeholder",
              "label": "Example text inside the box",
              "type": "string",
              "required": false
            }
          ]
        },
        {
          "name": "thank_you",
          "label": "Thank-you message after sending",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "title",
              "label": "Heading",
              "type": "string",
              "required": true
            },
            {
              "name": "text",
              "label": "Message",
              "type": "text",
              "required": true
            }
          ]
        }
      ]
    },
    "registry": {
      "path": "src/_data/registry.json",
      "label": "Registry",
      "fields": [
        {
          "name": "seo",
          "label": "Search & Sharing",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "title",
              "label": "Browser tab title",
              "type": "string",
              "required": true,
              "maxlength": 70
            },
            {
              "name": "description",
              "label": "Google description",
              "type": "text",
              "required": true,
              "maxlength": 160
            },
            {
              "name": "social_title",
              "label": "Link preview title",
              "type": "string",
              "required": false
            },
            {
              "name": "social_description",
              "label": "Link preview description",
              "type": "text",
              "required": false,
              "maxlength": 200
            }
          ]
        },
        {
          "name": "hero",
          "label": "Top of page",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "label",
              "label": "Small text above the title",
              "type": "string",
              "required": true
            },
            {
              "name": "title",
              "label": "Page title",
              "type": "string",
              "required": true
            },
            {
              "name": "subtitle",
              "label": "Text under the title",
              "type": "text",
              "required": true
            }
          ]
        },
        {
          "name": "photo",
          "label": "Wide photo",
          "type": "image",
          "required": false
        },
        {
          "name": "photo_alt",
          "label": "Photo description",
          "type": "string",
          "required": false
        },
        {
          "name": "focus",
          "label": "Photo crop",
          "type": "select",
          "required": true,
          "options": [
            "center",
            "high",
            "left"
          ]
        },
        {
          "name": "intro",
          "label": "Note at the top of the card",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "label",
              "label": "Small text",
              "type": "string",
              "required": true
            },
            {
              "name": "title",
              "label": "Heading",
              "type": "string",
              "required": true
            },
            {
              "name": "text",
              "label": "Message",
              "type": "text",
              "required": true
            }
          ]
        },
        {
          "name": "coming_soon",
          "label": "Coming soon",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "enabled",
              "label": "Show \"coming soon\" instead of the registry",
              "type": "boolean",
              "required": true
            },
            {
              "name": "label",
              "label": "Badge text",
              "type": "string",
              "required": true
            },
            {
              "name": "title",
              "label": "Heading",
              "type": "string",
              "required": true
            },
            {
              "name": "text",
              "label": "Message",
              "type": "text",
              "required": true
            }
          ]
        },
        {
          "name": "amazon",
          "label": "Amazon registry",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "url",
              "label": "Registry link",
              "type": "string",
              "required": true,
              "pattern": "^https?://\\S+$",
              "patternMessage": "Paste the full web address, starting with https://"
            },
            {
              "name": "title",
              "label": "Card heading",
              "type": "string",
              "required": true
            },
            {
              "name": "text",
              "label": "Note under the heading",
              "type": "text",
              "required": true
            },
            {
              "name": "button_text",
              "label": "Button text",
              "type": "string",
              "required": true
            }
          ]
        },
        {
          "name": "cash_fund",
          "label": "Cash fund (optional)",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "enabled",
              "label": "Show the cash fund card",
              "type": "boolean",
              "required": true
            },
            {
              "name": "title",
              "label": "Card heading",
              "type": "string",
              "required": true
            },
            {
              "name": "text",
              "label": "Note under the heading",
              "type": "text",
              "required": true
            },
            {
              "name": "url",
              "label": "Fund page link",
              "type": "string",
              "required": false,
              "pattern": "^https?://\\S+$",
              "patternMessage": "Paste the full web address, starting with https://"
            },
            {
              "name": "button_text",
              "label": "Button text",
              "type": "string",
              "required": false
            },
            {
              "name": "handles",
              "label": "Payment handles",
              "type": "list",
              "required": false,
              "fields": [
                {
                  "name": "label",
                  "label": "App",
                  "type": "string",
                  "required": true
                },
                {
                  "name": "value",
                  "label": "Username or handle",
                  "type": "string",
                  "required": true
                }
              ]
            }
          ]
        },
        {
          "name": "shipping_note",
          "label": "Shipping note",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "enabled",
              "label": "Show the shipping note",
              "type": "boolean",
              "required": true
            },
            {
              "name": "text",
              "label": "Message",
              "type": "text",
              "required": true
            }
          ]
        }
      ]
    },
    "travel": {
      "path": "src/_data/travel.json",
      "label": "Travel & Hotels",
      "fields": [
        {
          "name": "seo",
          "label": "Search & Sharing",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "title",
              "label": "Browser tab title",
              "type": "string",
              "required": true,
              "maxlength": 70
            },
            {
              "name": "description",
              "label": "Google description",
              "type": "text",
              "required": true,
              "maxlength": 160
            },
            {
              "name": "social_title",
              "label": "Link preview title",
              "type": "string",
              "required": false
            },
            {
              "name": "social_description",
              "label": "Link preview description",
              "type": "text",
              "required": false,
              "maxlength": 200
            }
          ]
        },
        {
          "name": "hero",
          "label": "Top of page",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "label",
              "label": "Small text above the title",
              "type": "string",
              "required": true
            },
            {
              "name": "title",
              "label": "Page title",
              "type": "string",
              "required": true
            },
            {
              "name": "subtitle",
              "label": "Text under the title",
              "type": "text",
              "required": true
            }
          ]
        },
        {
          "name": "section_order",
          "label": "Order of sections",
          "type": "select",
          "required": true,
          "options": [
            "room_block",
            "nearby",
            "airports",
            "tips"
          ],
          "multiple": true,
          "min": 4,
          "max": 4
        },
        {
          "name": "room_block",
          "label": "Room block",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "label",
              "label": "Small text",
              "type": "string",
              "required": true
            },
            {
              "name": "title",
              "label": "Heading",
              "type": "string",
              "required": true
            },
            {
              "name": "intro",
              "label": "Intro text",
              "type": "text",
              "required": true
            },
            {
              "name": "hotel_name",
              "label": "Hotel name",
              "type": "string",
              "required": true
            },
            {
              "name": "badge",
              "label": "Badge text",
              "type": "string",
              "required": true
            },
            {
              "name": "hotel_details",
              "label": "Hotel address / distance",
              "type": "string",
              "required": false
            },
            {
              "name": "deadline",
              "label": "Booking deadline",
              "type": "date",
              "required": false
            },
            {
              "name": "booking_note",
              "label": "Group code / booking note",
              "type": "string",
              "required": true
            },
            {
              "name": "booking_url",
              "label": "Booking link",
              "type": "string",
              "required": false,
              "pattern": "^https?://\\S+$",
              "patternMessage": "Paste the full web address, starting with https://"
            }
          ]
        },
        {
          "name": "nearby",
          "label": "Nearby hotels",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "label",
              "label": "Small text",
              "type": "string",
              "required": true
            },
            {
              "name": "title",
              "label": "Heading",
              "type": "string",
              "required": true
            },
            {
              "name": "empty_text",
              "label": "Message when no hotels are listed",
              "type": "string",
              "required": true
            },
            {
              "name": "hotels",
              "label": "Hotels",
              "type": "list",
              "required": false,
              "fields": [
                {
                  "name": "name",
                  "label": "Hotel name",
                  "type": "string",
                  "required": true
                },
                {
                  "name": "address",
                  "label": "Address",
                  "type": "string",
                  "required": false
                },
                {
                  "name": "distance",
                  "label": "Distance from the venue",
                  "type": "string",
                  "required": false
                },
                {
                  "name": "note",
                  "label": "Note",
                  "type": "string",
                  "required": false
                },
                {
                  "name": "url",
                  "label": "Website",
                  "type": "string",
                  "required": false,
                  "pattern": "^https?://\\S+$",
                  "patternMessage": "Paste the full web address, starting with https://"
                }
              ]
            }
          ]
        },
        {
          "name": "airports",
          "label": "Airports",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "label",
              "label": "Small text",
              "type": "string",
              "required": true
            },
            {
              "name": "title",
              "label": "Heading",
              "type": "string",
              "required": true
            },
            {
              "name": "card_title",
              "label": "Box heading",
              "type": "string",
              "required": true
            },
            {
              "name": "list",
              "label": "Airports",
              "type": "list",
              "required": true,
              "fields": [
                {
                  "name": "name",
                  "label": "Airport",
                  "type": "string",
                  "required": true
                },
                {
                  "name": "details",
                  "label": "Distance and notes",
                  "type": "text",
                  "required": true
                }
              ]
            },
            {
              "name": "footnote",
              "label": "Small print",
              "type": "string",
              "required": true
            }
          ]
        },
        {
          "name": "tips",
          "label": "Local tips",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "label",
              "label": "Small text",
              "type": "string",
              "required": true
            },
            {
              "name": "title",
              "label": "Heading",
              "type": "string",
              "required": true
            },
            {
              "name": "list",
              "label": "Tips",
              "type": "list",
              "required": true,
              "fields": [
                {
                  "name": "icon",
                  "label": "Icon",
                  "type": "select",
                  "required": true,
                  "options": [
                    "sun",
                    "car",
                    "compass",
                    "bed",
                    "mug",
                    "billiard",
                    "people",
                    "star"
                  ]
                },
                {
                  "name": "title",
                  "label": "Title",
                  "type": "string",
                  "required": true
                },
                {
                  "name": "text",
                  "label": "Tip",
                  "type": "text",
                  "required": true
                }
              ]
            }
          ]
        },
        {
          "name": "labels",
          "label": "Button & label wording",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "block_deadline",
              "label": "Label: Block deadline",
              "type": "string",
              "required": true
            },
            {
              "name": "to_be_announced",
              "label": "Text when there is no deadline yet",
              "type": "string",
              "required": true
            },
            {
              "name": "book_your_room",
              "label": "Button: Book your room",
              "type": "string",
              "required": true
            },
            {
              "name": "booking_link_coming_soon",
              "label": "Text when there is no booking link yet",
              "type": "string",
              "required": true
            },
            {
              "name": "visit_website",
              "label": "Button: Visit website",
              "type": "string",
              "required": true
            }
          ]
        }
      ]
    },
    "afterparty": {
      "path": "src/_data/afterparty.json",
      "label": "After Party",
      "fields": [
        {
          "name": "seo",
          "label": "Search & Sharing",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "title",
              "label": "Browser tab title",
              "type": "string",
              "required": true,
              "maxlength": 70
            },
            {
              "name": "description",
              "label": "Google description",
              "type": "text",
              "required": true,
              "maxlength": 160
            },
            {
              "name": "social_title",
              "label": "Link preview title",
              "type": "string",
              "required": false
            },
            {
              "name": "social_description",
              "label": "Link preview description",
              "type": "text",
              "required": false,
              "maxlength": 200
            }
          ]
        },
        {
          "name": "hero",
          "label": "Top of page",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "label",
              "label": "Small text above the title",
              "type": "string",
              "required": true
            },
            {
              "name": "title",
              "label": "Page title",
              "type": "string",
              "required": true
            },
            {
              "name": "subtitle",
              "label": "Text under the title",
              "type": "text",
              "required": true
            }
          ]
        },
        {
          "name": "section_order",
          "label": "Order of sections",
          "type": "select",
          "required": true,
          "options": [
            "details",
            "expect",
            "cta"
          ],
          "multiple": true,
          "min": 3,
          "max": 3
        },
        {
          "name": "details",
          "label": "Where & when",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "label",
              "label": "Small text",
              "type": "string",
              "required": true
            },
            {
              "name": "title",
              "label": "Heading",
              "type": "string",
              "required": true
            },
            {
              "name": "venue_name",
              "label": "Place name",
              "type": "string",
              "required": true
            },
            {
              "name": "address",
              "label": "Address",
              "type": "string",
              "required": true
            },
            {
              "name": "map_address",
              "label": "Address for the map",
              "type": "string",
              "required": false
            },
            {
              "name": "time",
              "label": "Time",
              "type": "string",
              "required": true
            },
            {
              "name": "time_note",
              "label": "Time note",
              "type": "string",
              "required": false
            },
            {
              "name": "dress_code",
              "label": "Dress code",
              "type": "string",
              "required": true
            },
            {
              "name": "open_to",
              "label": "Who's invited",
              "type": "string",
              "required": true
            },
            {
              "name": "map_note",
              "label": "Text in the map box before the address is known",
              "type": "string",
              "required": true
            }
          ]
        },
        {
          "name": "expect",
          "label": "What to expect",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "label",
              "label": "Small text",
              "type": "string",
              "required": true
            },
            {
              "name": "title",
              "label": "Heading",
              "type": "string",
              "required": true
            },
            {
              "name": "items",
              "label": "Items",
              "type": "list",
              "required": true,
              "fields": [
                {
                  "name": "icon",
                  "label": "Icon",
                  "type": "select",
                  "required": true,
                  "options": [
                    "sun",
                    "car",
                    "compass",
                    "bed",
                    "mug",
                    "billiard",
                    "people",
                    "star"
                  ]
                },
                {
                  "name": "title",
                  "label": "Title",
                  "type": "string",
                  "required": true
                },
                {
                  "name": "text",
                  "label": "Description",
                  "type": "text",
                  "required": true
                }
              ]
            }
          ]
        },
        {
          "name": "cta",
          "label": "Bottom section",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "title",
              "label": "Heading",
              "type": "string",
              "required": true
            },
            {
              "name": "text",
              "label": "Message",
              "type": "text",
              "required": true
            }
          ]
        },
        {
          "name": "labels",
          "label": "Button & label wording",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "address",
              "label": "Label: Address",
              "type": "string",
              "required": true
            },
            {
              "name": "time",
              "label": "Label: Time",
              "type": "string",
              "required": true
            },
            {
              "name": "dress_code",
              "label": "Label: Dress code",
              "type": "string",
              "required": true
            },
            {
              "name": "open_to",
              "label": "Label: Open to",
              "type": "string",
              "required": true
            },
            {
              "name": "wedding_details",
              "label": "Button: Wedding details",
              "type": "string",
              "required": true
            }
          ]
        }
      ]
    },
    "faq": {
      "path": "src/_data/faq.json",
      "label": "FAQ",
      "fields": [
        {
          "name": "seo",
          "label": "Search & Sharing",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "title",
              "label": "Browser tab title",
              "type": "string",
              "required": true,
              "maxlength": 70
            },
            {
              "name": "description",
              "label": "Google description",
              "type": "text",
              "required": true,
              "maxlength": 160
            },
            {
              "name": "social_title",
              "label": "Link preview title",
              "type": "string",
              "required": false
            },
            {
              "name": "social_description",
              "label": "Link preview description",
              "type": "text",
              "required": false,
              "maxlength": 200
            }
          ]
        },
        {
          "name": "hero",
          "label": "Top of page",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "label",
              "label": "Small text above the title",
              "type": "string",
              "required": true
            },
            {
              "name": "title",
              "label": "Page title",
              "type": "string",
              "required": true
            },
            {
              "name": "subtitle",
              "label": "Text under the title",
              "type": "string",
              "required": true
            }
          ]
        },
        {
          "name": "list_header",
          "label": "Heading above the questions",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "label",
              "label": "Small text",
              "type": "string",
              "required": true
            },
            {
              "name": "title",
              "label": "Heading",
              "type": "string",
              "required": true
            }
          ]
        },
        {
          "name": "questions",
          "label": "Questions",
          "type": "list",
          "required": true,
          "fields": [
            {
              "name": "question",
              "label": "Question",
              "type": "string",
              "required": true
            },
            {
              "name": "answer",
              "label": "Answer",
              "type": "markdown",
              "required": true
            }
          ]
        },
        {
          "name": "cta",
          "label": "Bottom section",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "title",
              "label": "Heading",
              "type": "string",
              "required": true
            },
            {
              "name": "text",
              "label": "Message",
              "type": "text",
              "required": true
            }
          ]
        },
        {
          "name": "labels",
          "label": "Button & label wording",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "email_us",
              "label": "Button: Email us",
              "type": "string",
              "required": true
            },
            {
              "name": "see_the_details",
              "label": "Button: See the details",
              "type": "string",
              "required": true
            }
          ]
        }
      ]
    },
    "gallery": {
      "path": "src/_data/gallery.json",
      "label": "Gallery",
      "fields": [
        {
          "name": "seo",
          "label": "Search & Sharing",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "title",
              "label": "Browser tab title",
              "type": "string",
              "required": true,
              "maxlength": 70
            },
            {
              "name": "description",
              "label": "Google description",
              "type": "text",
              "required": true,
              "maxlength": 160
            },
            {
              "name": "social_title",
              "label": "Link preview title",
              "type": "string",
              "required": false
            },
            {
              "name": "social_description",
              "label": "Link preview description",
              "type": "text",
              "required": false,
              "maxlength": 200
            }
          ]
        },
        {
          "name": "hero",
          "label": "Top of page",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "label",
              "label": "Small text above the title",
              "type": "string",
              "required": true
            },
            {
              "name": "title",
              "label": "Page title",
              "type": "string",
              "required": true
            },
            {
              "name": "subtitle",
              "label": "Text under the title",
              "type": "text",
              "required": true
            }
          ]
        },
        {
          "name": "header",
          "label": "Heading above the photos",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "label",
              "label": "Small text",
              "type": "string",
              "required": true
            },
            {
              "name": "title",
              "label": "Heading",
              "type": "string",
              "required": true
            }
          ]
        },
        {
          "name": "photos",
          "label": "Photos",
          "type": "list",
          "required": true,
          "fields": [
            {
              "name": "image",
              "label": "Photo",
              "type": "image",
              "required": true
            },
            {
              "name": "alt",
              "label": "Photo description",
              "type": "string",
              "required": true
            }
          ]
        },
        {
          "name": "wedding_photos",
          "label": "Wedding photos note",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "label",
              "label": "Small text",
              "type": "string",
              "required": true
            },
            {
              "name": "title",
              "label": "Heading",
              "type": "string",
              "required": true
            },
            {
              "name": "text",
              "label": "Message",
              "type": "text",
              "required": true
            }
          ]
        },
        {
          "name": "labels",
          "label": "Button & label wording",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "see_the_details",
              "label": "Button: See the details",
              "type": "string",
              "required": true
            }
          ]
        }
      ]
    },
    "notfound": {
      "path": "src/_data/notfound.json",
      "label": "Page Not Found (404)",
      "fields": [
        {
          "name": "seo",
          "label": "Search & Sharing",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "title",
              "label": "Browser tab title",
              "type": "string",
              "required": true
            },
            {
              "name": "description",
              "label": "Description",
              "type": "text",
              "required": true
            }
          ]
        },
        {
          "name": "title",
          "label": "Heading",
          "type": "string",
          "required": true
        },
        {
          "name": "text",
          "label": "Message",
          "type": "text",
          "required": true
        },
        {
          "name": "labels",
          "label": "Button & label wording",
          "type": "object",
          "required": true,
          "fields": [
            {
              "name": "back_to_home",
              "label": "Button: Back to home",
              "type": "string",
              "required": true
            },
            {
              "name": "rsvp",
              "label": "Button: RSVP",
              "type": "string",
              "required": true
            }
          ]
        }
      ]
    },
    "guests": {
      "path": "src/_data/guests.json",
      "label": "Guest List",
      "fields": [
        {
          "name": "guests",
          "label": "Guests",
          "type": "list",
          "required": true,
          "fields": [
            {
              "name": "id",
              "label": "Guest number",
              "type": "string",
              "required": true
            },
            {
              "name": "name",
              "label": "Full name",
              "type": "string",
              "required": true
            },
            {
              "name": "party",
              "label": "Others on this invitation",
              "type": "list",
              "required": false,
              "fields": [
                {
                  "name": "name",
                  "label": "Name",
                  "type": "string",
                  "required": false
                }
              ]
            }
          ]
        }
      ]
    }
  }
};
