#GrammarBuffet

This is an expanded version of my previous two web apps which have essentially the same purpose: assisting ESL students in revising their own writing for articles.
The primary difference between this effort and the two previous designs is that the "Regular" mode in Grammarbuffet presents the user
with something that looks very similar to what they see when they try to revise something they've written: they don't necessarily have
any explicit markers of where their errors are or what their errors are. In addition, this app presents the choice between three different
genres (Business/Academic/Fiction), whereas previous attempts have focused on only one.

This app uses real-time data from the BBC Business News site, Arxiv.org (an open-access repository of academic articles and abstracts), and Reddit,
stripping the articles and asking the user to supply the original articles (on "Easy" mode) and insert articles where the user thinks
they are missing (in "Regular" mode).

Directions for future development

-Fix issues passing Academic texts via URLs (format the strings in the short-term, retrieving these from a DB would be a better long-term solution)

-Add functionality to highlight singular & countable nouns as a hint in "Regular" mode (these are the nodes around which article issues
tend to cluster)

-Add functionality for the user to specify number of errors to revise

-Move the app to be hosted on a VPS (Digital Ocean or AWS)

-Add in a database to store texts, updated 1+ times daily (would scale better)

-Change feedback to be presented using modals

-Clean up design (generally) and optimize for different screen sizes (eg, adding breakpoints)
