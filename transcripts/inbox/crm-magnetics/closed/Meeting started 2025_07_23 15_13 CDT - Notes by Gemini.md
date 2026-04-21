# 📝 Notes

Jul 23, 2025

## Meeting Jul 23, 2025 at 15:13 CDT

Meeting records [Transcript](?tab=t.1vgbq57e4t30) [Recording](https://drive.google.com/file/d/1EPZCc0dolsLu0bBFDftOJJECuiZq7q5G/view?usp=drive_web) 

### Summary

Sergio Viramontes shared that their company recently transitioned to HubSpot, highlighting challenges with automating subscription invoicing and updating company fields, especially for enterprise customers with monthly/quarterly payments. Benji Twerskoi proposed using HubSpot's calculation properties and workflows for automation, acknowledging complexities with diverse payment types. Benji Twerskoi explained CRM Magnetics' "revops as a service" model, with Landon Schlag detailing the monthly consultative plans. Sergio Viramontes requested a follow-up via email.

### Details

* **HubSpot Adoption and Challenges** Sergio Viramontes indicated that their company recently transitioned to HubSpot in the first quarter of the current year, moving from a previous CRM system ([00:00:00](#00:00:00)). They chose HubSpot due to its integration capabilities with their existing tech stack, including Zendesk for customer engagement and ZoomInfo for contact information, and its interaction with their custom-built system for managing 25,000 customers ([00:01:04](#00:01:04)). Sergio Viramontes, who oversees their company's HubSpot ([00:07:14](#00:07:14)), highlighted key challenges such as automating the invoicing process for subscriptions, particularly for clients paying monthly or quarterly rather than upfront, and updating company fields from contract data ([00:03:23](#00:03:23)).

* **Subscription Billing Automation** Sergio Viramontes explained that their current process for generating ongoing invoices for monthly or quarterly subscriptions is manual, unlike the automatic invoicing for annual contracts ([00:04:22](#00:04:22)) ([00:10:59](#00:10:59)). They noted HubSpot's subscription tool does not allow for tracking specific custom fields essential for their accounting, such as the billing period (e.g., "month of July") ([00:10:00](#00:10:00)) ([00:11:59](#00:11:59)). Sergio Viramontes emphasized the need for automation to manage recurring billing for approximately 100 enterprise customers who pay over time, avoiding revenue sharing with platform partners ([00:14:00](#00:14:00)) ([00:16:04](#00:16:04)).

* **Proposed Technical Solutions for Automation** Benji Twerskoi suggested leveraging HubSpot's calculation properties and workflows to automate invoice generation and sending. They proposed creating calculation properties for subscription start dates and using delays within workflows to trigger invoices through integration with a third-party app ([00:12:57](#00:12:57)). Benji Twerskoi acknowledged the complexity of diverse payment types, including physical checks, which would require manual tracking ([00:17:56](#00:17:56)).

* **CRM Magnetics' Services and Engagement Model** Benji Twerskoi explained that CRM Magnetics reached out to Sergio Viramontes because their company fit their ideal client profile, based on employee count and job title ([00:18:46](#00:18:46)). They described CRM Magnetics as a HubSpot optimization agency specializing in revenue operations, including marketing, sales, business development, and customer service processes ([00:19:45](#00:19:45)). Landon Schlag further detailed their "revops as a service" plan, a monthly, consultative approach with an initial three-month contract available in Silver (10 hours/month at $130/hour) or Gold (20 hours/month at $110/hour) tiers, with a Platinum plan for more extensive needs ([00:22:44](#00:22:44)).

* **Experience and Confidence in Solutions** Benji Twerskoi, who would serve as the solutions architect for Sergio Viramontes' project, stated they have six years of experience with HubSpot and have worked with various CRMs ([00:25:50](#00:25:50)). They expressed confidence in their ability to find solutions for complex automation challenges, even if the exact method isn't immediately clear, drawing on their experience with intricate implementations for tech and SaaS companies ([00:28:55](#00:28:55)) ([00:30:33](#00:30:33)). Sergio Viramontes noted that HubSpot's current functionality, despite billing challenges, is a significant improvement over their previous system ([00:26:47](#00:26:47)).

* **Project Implementation and Assurance** Sergio Viramontes asked how they would determine if CRM Magnetics could deliver on the proposed solutions, likening it to their own service, which offers a free trial for evaluation ([00:29:52](#00:29:52)). Benji Twerskoi clarified that the question is whether a solution is possible, and if so, CRM Magnetics is likely capable of implementing it, given their expertise ([00:30:33](#00:30:33)). Sergio Viramontes requested a summary of the discussion and information to be sent via email, with a follow-up touchpoint scheduled for the following week ([00:30:33](#00:30:33)).

### Suggested next steps

- [ ] Landon Schlag will email Sergio Viramontes a summary of the operational benefits of using CRM magnetics.  
- [ ] Landon Schlag and Sergio Viramontes will connect next week to review the information.

*You should review Gemini's notes to make sure they're accurate. [Get tips and learn how Gemini takes notes](https://support.google.com/meet/answer/14754931)*

*Please provide feedback about using Gemini to take notes in a [short survey.](https://google.qualtrics.com/jfe/form/SV_9vK3UZEaIQKKE7A?confid=gxiw2myhtA-PeTC_3vI8DxIWOAIIigIgABgBCA)*

# 📖 Transcript

Jul 23, 2025

## Meeting Jul 23, 2025 at 15:13 CDT \- Transcript

### 00:00:00 {#00:00:00}

   
**Landon Schlag:** made you I guess I I'll ask up front. What kind of made you take this call today? I know we obviously reached out to you, but what made you interested in going over HubSpot optimization today?  
**Sergio Viramontes:** Yeah. So, so we we are a recent convert to HubSpot. We we transitioned fully early this year, probably the first first quarter. We weren't really fully um rolled over from our our previous CRM system. Um we we brought in um HubSpot because of our prior uh platform. We were using a couple different platforms to manage all our customer um engagement. And so after reviewing and in my prior roles, I've run a number of sales organizations, different operations sales. Um I've used other services. My background has been in using, you know, Salesforce for the most part. Um, I had never used HubSpot, but as looking at the different platform, where we are at the as a company, I felt I felt that that HubSpot was a good fit for what we were using um our our current uh systems for.  
   
 

### 00:01:04 {#00:01:04}

   
**Sergio Viramontes:** um the way it integrates with the current tech stack which means how we engage with our Zenesk um ticket system to manage our customer engagement, how we use uh we use Zoom info quite a bit for uh filling the proverbial holes on contact information,  
**Landon Schlag:** Mhm.  
**Sergio Viramontes:** um how it interacts with our our custommade our customuilt uh system to manage our you know 25,000 customers. All  
**Landon Schlag:** Mhm.  
**Sergio Viramontes:** of that really kind of land it land lended itself to using um HubSpot. Uh and for the most part it's been great. I haven't had any problem with working on this. Um it seems um uh what was I say? um what we um we come across a couple of of of of things and quite frankly I've not really had a chance to to review and know I run a business so it's not like I'm doing I don't have a full-time uh CRM manager so  
**Landon Schlag:** Right.  
**Sergio Viramontes:** one of the questions that I have number one this is one of a handful of HubSpot partners that that reached out to me so again I appreciate you asking But  
   
 

### 00:02:17

   
**Landon Schlag:** Of course.  
**Sergio Viramontes:** we have our software uh is sold um through a couple different ways, but most of the the software that we sell is done via some form of subscription, meaning you're signing up for a contract of some some form, either it's annual or multi-year. Um  
**Landon Schlag:** Mhm.  
**Sergio Viramontes:** usually paid paid um upfront. Um but we do have a number of clients that um are paying either over time whether it's through um a de electronic payment, physical checks, even people that want to pay through uh like using a credit card through PayPal. Uh and and HubSpot does offer a different couple of different options on how to accept payments. We just don't want to make them business partners for us. We don't want to give them um a percentage of ourselves. That's not what they're there for. So, I don't necessarily want to use their payment systems for people that want to pay electronically with a credit card. They have service that they offer through that. I just want to see what my options are.  
   
 

### 00:03:23 {#00:03:23}

   
**Sergio Viramontes:** Um the other thing is  
**Landon Schlag:** like Stripe  
**Sergio Viramontes:** um  
**Landon Schlag:** for example. Is that you've I'm sure you you're familiar with Stripe. Is that  
**Sergio Viramontes:** yeah, they use Stripe, but they charge to use Stripe. They  
**Landon Schlag:** right?  
**Sergio Viramontes:** charge for their services. It's like you don't own Stripe. If you want us to, you know, pay a a monthly fee, I'm okay with that. But they're literally asking for a percentage of the transaction.  
**Landon Schlag:** All right.  
**Sergio Viramontes:** Um so, so the other piece of this puzzle is that um when we do sell a contract, it's pretty straightforward. We're able to generate a contract within HubSpot. It's got a nice lovely invoicing system. um and it generates a bill for this is the amount and and our we could convert that into an invoice. It sends it out no problem. We're what I'm coming across is how to automate the process from going from generating a contract to an invoice and then taking that invoice who wants to pay maybe monthly, right?  
   
 

### 00:04:22 {#00:04:22}

   
**Sergio Viramontes:** And then how do you generate ongoing invoices for the for the length of the contract, right? So currently it it's all manual. Uh you have to manually create that I'm aware of uh unless you do their subscription processes. Uh which again part of the challenge for subscriptions is it's a very specific software that I sell and there there might be maybe 25 different options within the the platforms that we sell. Identifying that in the in the contract, putting it in the contract, creating an invoice, not an issue.  
**Landon Schlag:** Mhm.  
**Sergio Viramontes:** It's really for me is the the the the terms of service. If it's going to this if this invoice is going to be for the month of January, it needs to say it on the invoice for our bookkeeping purpose because we are connected through HubSpot with QuickBooks so that  
**Landon Schlag:** Right.  
**Sergio Viramontes:** everything that we generate does automatically get managed. So, I'm just looking for someone to to help me not not HubSpot not not been very helpful to see if there's ways to maybe automate some of these processes, right?  
   
 

### 00:05:29

   
**Sergio Viramontes:** the billing more importantly  
**Landon Schlag:** Mhm.  
**Sergio Viramontes:** uh specifically around subscriptions and then um as I do take the customer through the process of the different stages how can we uh take one field that's used in the contract and automatically update uh those fields under the company section if that makes sense right so  
**Landon Schlag:** Mhm.  
**Sergio Viramontes:** the the the  
**Landon Schlag:** With like a sales intelligence tool  
**Benji Twerskoi:** Look.  
**Sergio Viramontes:** say again  
**Landon Schlag:** with like a sales intelligence tool automatically updating the contact information, the company information in your HubSpot.  
**Sergio Viramontes:** Yeah.  
**Landon Schlag:** Yeah. Do you guys  
**Sergio Viramontes:** Yeah.  
**Landon Schlag:** use like a follower or you said Zoom info, right? Was that did I hear that correctly?  
**Sergio Viramontes:** Yeah.  
**Landon Schlag:** Okay. Okay.  
**Sergio Viramontes:** Yeah.  
**Landon Schlag:** We'll let Benji go more in depth on that in a little bit here, but I have a few HubSpot questions, then I'll hand it over to him. Um, but what you said is very within a wheelhouse automation. Um, and like you said with the sales intelligence tool, getting that up-to-date information.  
   
 

### 00:06:22

   
**Landon Schlag:** We can certainly help you with that. Um, but that being said, real quick, how many number like what's the number of HubSpot users currently at your company there?  
**Sergio Viramontes:** We don't have that many. We uh there's probably about uh at most 10 HubSpot users.  
**Landon Schlag:** 10\.  
**Sergio Viramontes:** Of those  
**Landon Schlag:** Okay.  
**Sergio Viramontes:** 10, we might have maybe five that are  
**Landon Schlag:** Mhm.  
**Sergio Viramontes:** technically um active daily users. Uh  
**Landon Schlag:** Mhm.  
**Sergio Viramontes:** we have some HubSpot users that are just for the most part just looking and accessing uh engagement. Like say you're you're a customer success person. um they just find you know the contacts within the organization they're all connected obviously through our u Gmail so that all the email engagement is still being uploaded into HubSpot but they very rarely go into HubSpot to do anything within HubSpot if that makes sense  
**Landon Schlag:** No,  
**Sergio Viramontes:** there's  
**Landon Schlag:** understood.  
**Sergio Viramontes:** half a dozen half a dozen maybe  
**Landon Schlag:** Half.  
**Sergio Viramontes:** that are actively  
**Landon Schlag:** Okay.  
**Sergio Viramontes:** doing  
   
 

### 00:07:14 {#00:07:14}

   
**Landon Schlag:** And  
**Sergio Viramontes:** something  
**Landon Schlag:** you're the main overseer of your HubSpot, correct? You're the you're the guy  
**Sergio Viramontes:** yeah for our conversation  
**Landon Schlag:** for our conversation. Understood. Okay. Um, and do you have an idea of how many contacts you currently have in HubSpot? Just an estimate is completely fine.  
**Sergio Viramontes:** Um, well, I can tell you exactly, but uh, more or less, um, we're we're looking at maybe 40,000 contacts,  
**Landon Schlag:** Okay, good amount. Okay.  
**Sergio Viramontes:** but again, that's not necessarily my uh, I don't really care about the contacts. I'm more care care about the companies. We have about um maybe 10,000 companies that we're tracking and we have about a thousand of them that are that are the ones that I'm concerned about for subscriptions and contracts and so and so  
**Landon Schlag:** Okay.  
**Sergio Viramontes:** on.  
**Landon Schlag:** Well, since you brought that up, speaking of that, what is your ideal client profile for the company and contact? What are you looking for?  
**Sergio Viramontes:** What do you mean the  
   
 

### 00:08:12

   
**Landon Schlag:** Like  
**Sergio Viramontes:** type  
**Landon Schlag:** your  
**Sergio Viramontes:** of  
**Landon Schlag:** ideal  
**Sergio Viramontes:** company  
**Landon Schlag:** client persona, like who you're looking for like on the both like the contact and company level when you look up like a different lead or if you're looking like your ideal client basically.  
**Sergio Viramontes:** Oh. Uh, it's a e-commerce director. So, it's Steve  
**Landon Schlag:** Okay.  
**Sergio Viramontes:** Madden. Whoever the e-commerce director of Steve Madden  
**Landon Schlag:** Okay. Pretty straightforward. Cool. Um, yeah. I mean, those are my basic questions. Um, and I think we have enough information to work with. If you want to kind of go more in depth on all, we can help his uh his issues there and uh see if we can help him out. So, feel free to  
**Benji Twerskoi:** Yeah,  
**Landon Schlag:** take it away.  
**Benji Twerskoi:** absolutely. Uh, thanks for that information, Sergio. Uh, it it sounds like, you know, you have some specific problems that you're trying to solve. You know, like we we get on a lot of these calls, some people are like, "Well, I don't know what I'm doing. uh  
   
 

### 00:08:56

   
**Benji Twerskoi:** what do you recommend right but in your case you know exactly what you're doing and you have like some specific issues that you want to resolve so I think let's just talk about them one by one the the three that you mentioned and see like I I want to just go a little bit deeper into them right so uh you have you were saying about um the contract signature and autocustom invoicing process integration right so essentially my understanding is you want to have like uh for for your subscription um model that that you're selling. Uh for the customers that don't pay upfront, but they pay more or less like on a monthly basis, you want to be able to like autogenerate invoices every month and have the invoices automatically sent to those customers without kind of any human  
**Sergio Viramontes:** Yeah.  
**Benji Twerskoi:** involvement  
**Sergio Viramontes:** So,  
**Benji Twerskoi:** or am I misundersting?  
**Sergio Viramontes:** correct. So, so currently um HubSpot does offer a subscription tool. It has it's not been fully vetted. It hasn't been fully that I can tell.  
   
 

### 00:10:00 {#00:10:00}

   
**Sergio Viramontes:** Um, when I first started working with them, they didn't even have a subscription model. Um, you couldn't modify and track very specific fields within those models. Um, there's there's there's basically five specific um fields that are important to me that's important  
**Benji Twerskoi:** Okay.  
**Sergio Viramontes:** to my accounting team for for just our conversation.  
**Benji Twerskoi:** Okay.  
**Sergio Viramontes:** And we could not um create those custom fields within the subscription side of the business. On the invoicing side of the business, no problem. I was able to generate these custom fields within HubSpot. So, they were able to track all this stuff. But under subscriptions, it doesn't it didn't allow me to do those custom fields.  
**Benji Twerskoi:** Okay, hang on. Subscriptions. Is that like a custom object? Is that what you're talking about?  
**Sergio Viramontes:** No, subscriptions is u so there's a couple ways of when you're dealing with invoicing. Um we sell what's called software as a service. Software  
**Benji Twerskoi:** Um  
**Sergio Viramontes:** as a service typically has an ongoing cost associated to it, right?  
   
 

### 00:10:59 {#00:10:59}

   
**Sergio Viramontes:** So they're they're either paying annually uh upfront, they're paying monthly, every month, same amount, they're paying quarterly, that means every three months they're paying a certain set  
**Benji Twerskoi:** Right.  
**Sergio Viramontes:** fee, or they're paying half a year, every six months they're paying a chunk.  
**Benji Twerskoi:** Right.  
**Sergio Viramontes:** That's normally what happens. The the platform itself, the price doesn't vary. It's always the same fixed rate, but it's always that price.  
**Benji Twerskoi:** Right.  
**Sergio Viramontes:** Um and people buy license they license this technology it today is the 23rd of July the license will go from the 23rd of July 2025 to uh July 23rd 2026\. So the invoicing that happens needs to be okay as of today your invoicing from today this period to next month the same day. And then that's let's call it $1,000 a month. that invoice is going to be generated uh manually currently, which we  
**Benji Twerskoi:** Mhm.  
**Sergio Viramontes:** have no problem doing that. Um it just doesn't do it automatically. It's it doesn't generate the next month's bill and the  
**Benji Twerskoi:** No.  
   
 

### 00:11:59 {#00:11:59}

   
**Sergio Viramontes:** next month's bill. That's all a manual invoice. Subscriptions  
**Benji Twerskoi:** Okay.  
**Sergio Viramontes:** allow you to do the same thing, but it does it automatically on the certain same date of every month. It's going to generate this for this same amount for this product. with subscriptions under the way they have it set up. I couldn't put July 23rd to to August 23rd at the next bill. It wouldn't automatically do that. It was really goofy. It it didn't allow me to set these custom fields that we needed to say for the month of July, the month of August, the month of September, the month of se, you know, so it didn't automatically generate that. It  
**Benji Twerskoi:** Okay.  
**Sergio Viramontes:** wasn't smart enough to recognize that.  
**Benji Twerskoi:** Here's what I would say instinctually speaking, right? I I'm I'm a big lover of automation and  
**Sergio Viramontes:** Thank  
**Benji Twerskoi:** you  
**Sergio Viramontes:** you.  
**Benji Twerskoi:** know the the first way how we need to accomplish that, right? Well, that we could try to accomplish that.  
   
 

### 00:12:57 {#00:12:57}

   
**Benji Twerskoi:** Uh so HubSpot has really sophisticated um calculation properties that you can use, right? So for example, we can create calculation properties with um a date, right? Like for example, uh subscription start date or like first in invoice date, right? And then uh in HubSpot, you have to like add milliseconds. It's kind of stupid, but that's how you use it. You add milliseconds. you add like two billion milliseconds to make the the next date automatically calculate one month from that time, right? And so keep populating it that way. So that could be an idea in terms of triggering the uh triggering the invoices to go out on the right dates like for example, right? Uh or you could maybe put it into a workflow uh with like a delay, right? Type of delay uh thing and then create an invoice through the workflow um integrated with a thirdparty app, right? and automate it that way. Does that kind of make sense what my thinking is?  
**Sergio Viramontes:** Yeah, sure.  
**Benji Twerskoi:** Have you tried something along those lines?  
   
 

### 00:14:00 {#00:14:00}

   
**Benji Twerskoi:** Obviously, like I would really have to kind of dig into the specifics, figure out like what are the important five properties uh that we need in order to be able to determine you know what are the thousand uh deals that that are in subscription model that would require this implementation. So that would be one part and then you know all those  
**Sergio Viramontes:** kind of step back a little bit. Uh there not that there's a thousand deals because it's already in it's already in route. I would say maybe 200 maybe 200 even even less let's call it 100 100 deals 100 that are needed to be tracked via this monthly billing meth mechanism. The other ones are if if I send a contract for say Steve Madden, they're going to I'm going to send them an invoice. They're going to send me a check for the full amount pretty much within 30 days.  
**Benji Twerskoi:** Mhm.  
**Sergio Viramontes:** That's how they typically we've been doing this for years and years and years. It's not a problem. This current methodology of of billing someone over over a period of a year.  
   
 

### 00:15:03

   
**Sergio Viramontes:** Uh that's something relatively new. Uh we we could go through the platforms. We work with what we call platform partners. In other words, what we do resides within say Shopify, Big Commerce, Magento, Woo Commerce. those platforms. Um, as a user of say Shopify, you are you already have the ability to buy services that could help augment your e-commerce site. We we do search and merchandising. Other people might do recommendations. Other people might do, you know, loyalty programs. Those services are built directly through Shopify's own app environment. Think of  
**Benji Twerskoi:** Mhm.  
**Sergio Viramontes:** it as the Apple environment. You can't buy anything for your phone, your Apple phone, without going through the iPhone app, right? That's  
**Benji Twerskoi:** Right.  
**Sergio Viramontes:** exactly what Shopify, Magento, Woomer, all these companies do the same exact thing. They make a percentage of everything that they sell.  
**Benji Twerskoi:** Right.  
**Sergio Viramontes:** Except enterprise customers. Enterprise customers, they could have an engagement with me and that engagement will be direct.  
   
 

### 00:16:04 {#00:16:04}

   
**Sergio Viramontes:** I don't have to share any revenue with any of my business partners. In this particular case, these 100 customers, I could technically run this through the platforms. I just don't want to share that with those partners. And and I'm not the only one. There's other people that do the same. I mean, it's not like it's, oh, we're breaking someone's we're not paying taxes. Has nothing  
**Benji Twerskoi:** You  
**Sergio Viramontes:** to do  
**Benji Twerskoi:** mean  
**Sergio Viramontes:** with that.  
**Benji Twerskoi:** for the transaction, right? Like was  
**Sergio Viramontes:** Yes.  
**Benji Twerskoi:** it like 3% 4% something like that?  
**Sergio Viramontes:** Yes.  
**Benji Twerskoi:** Is that  
**Sergio Viramontes:** Exactly.  
**Benji Twerskoi:** correct?  
**Sergio Viramontes:** Or even more. So, so this is typical, right? and and for our customers that are on this these these pay overtime plans we we still manage it. We we have you know again maybe a hundred that maybe that we have that do this that means we have to generate 12 invoices basically once we close a deal we have to create 12 invoices and then automatically send those 12 invoices for whatever the next 12 months basically Right.  
   
 

### 00:17:01

   
**Benji Twerskoi:** What if what if you had something along the lines where one time you manually input in HubSpot for example uh how often do you send the invoice? you select like monthly or quarterly  
**Sergio Viramontes:** Y  
**Benji Twerskoi:** or whatever, right? And then you also have a field how many invoices to submit, right? So you input  
**Sergio Viramontes:** right.  
**Benji Twerskoi:** that data and so that would ideally then trigger the invoices just to get sent out depending on the input that you did. Right? Now  
**Sergio Viramontes:** Right.  
**Benji Twerskoi:** that to me that sounds like a very solid like ideal state type of solution, right? Which is very automatic and not manual. Regarding the fees, I can't tell you. I'm no I'm not an expert on, you know, payment platform fees. So, that we would have to look up and, you know, maybe that would be a conversation when we're determining the tech stack that we're trying to use, like the apps to integrate with HubSpot. I mean, then that would be a factor is the fees, right?  
   
 

### 00:17:56 {#00:17:56}

   
**Benji Twerskoi:** Like which platforms do we use and how do we actually process the payments, stuff like that. There's  
**Sergio Viramontes:** Yeah.  
**Benji Twerskoi:** other things to consider as well. Like for example, one complexity that you mentioned that you know caught my attention was that there's like a lot of different payment types. Like some even do like you know paper checks that they send and stuff like that, right? Like so how do we capture all of that? Well paper checks that sounds that that sounds like manual, right? Because like how else do you track that if it's not digital? Like if you don't have any D, right? So things like that. So like my point is that I think there's a lot of factors about your specific thing to figure out, right? But I mean I'm getting like a sort of an understanding of how I would approach in terms of you know ideal output ideal implementation what we want to accomplish and then trying to get as close as possible to that ideal implementation you know that would be kind of my thoughts on  
   
 

### 00:18:46 {#00:18:46}

   
**Sergio Viramontes:** Yeah, I I I I still think that um there is a possibility of using their subscription model. I just haven't seen anyone use it. Now again, I'm telling you what we do. So  
**Benji Twerskoi:** Mhm.  
**Sergio Viramontes:** what does CRM Magnetics do? What how is your how how are you uh engaged with HubSpot? What is a tell me where how how this engagement first started? How did you get to me? How did how did you reach out? What was it? What was the driver to connect with me?  
**Benji Twerskoi:** Well, uh, we reached out to you with, uh, you know, because you hit you fit our ICP, right? So, for our our ICP, uh, we usually work with companies between like 20 and 150 employees, right? And you were a fit based on like job title and things like that, right? Like people that we usually work with. Um, and so we have like really cool tech stack internally of how we reach out using like AI and like messaging that will resonate, things like that, right?  
   
 

### 00:19:45 {#00:19:45}

   
**Benji Twerskoi:** So we reached out to you through a cold email campaign, right? But we are a uh HubSpot optimization agency and actually you know usually I'll I'll share the screen but we were kind of talking about you know your specific uh implementation but I think this will kind of show you what we do. We're we're experts in everything. HubSpot, revenue, operations, right? Which includes marketing, uh uh sales, which is sales, business development, customer service, all of the processes that you know that go into here. So for you, you know, I think sales, you were talking about deal closing process. I think this is actually where your focus is. Things such as like the e- signature integration, you know, quoting you, um invoicing, things like that. I think this is specifically where you know what you're describing lies within kind of what we do.  
**Sergio Viramontes:** Right.  
**Benji Twerskoi:** Does that answer your question?  
**Sergio Viramontes:** Yeah. Yeah. So, so your service here of being able to offer um sort of a consultancy of how to solve this issue uh and and you you have other services there.  
   
 

### 00:20:53

   
**Sergio Viramontes:** If you scroll up or scroll down, you I saw CRM um folks, you know, how does CSM people use this? How do the marketing team how how would they use HubSpot? Uh that's all that's all um on the table too. We we do have a you know a marketing team that could help that could be helped by someone how to to to help sort of streamline those processes. uh business development, you know, sure we we use again Zoom info. It is connected to HubSpot. So we we can automate some of the processes there. How to how to go from a lead to a handoff and then go a little bit higher. Uh go keep  
**Benji Twerskoi:** Lower  
**Sergio Viramontes:** on  
**Benji Twerskoi:** or  
**Sergio Viramontes:** going  
**Benji Twerskoi:** high? Yeah.  
**Sergio Viramontes:** keep on keep on going. Uh head of customer success or customer service.  
**Benji Twerskoi:** Oh,  
**Sergio Viramontes:** So how  
**Benji Twerskoi:** yes.  
**Sergio Viramontes:** do you manage customer engagement? How do you track, you know, resolution of issues, customer satisfa um there are things that are part of our service tool just done under me, right?  
   
 

### 00:21:52

   
**Sergio Viramontes:** I don't have to manage that stuff. So there  
**Benji Twerskoi:** red.  
**Sergio Viramontes:** might be someone that manages customer success that would be, you know, someone that that we might use your services for. Hey, we our customer success team uses HubSpot to track, you know, usage and and you know, customer satisfaction, all the different things you mentioned. So, there's other services. So, I guess my question to you is you guys are consultants. You know, we have this kind of 30 minute like get to know me. Uh you put together a proposal of okay, we will help you with your automation of of these building things. Um here's some examples of customers we work with. Here's some phone numbers. uh this is what we're going to charge you for our services. Can you kind of go into that? What does your typical engagement look like?  
**Benji Twerskoi:** I'm going to go ahead and hand it off to Landon because I'm more the technical guy. So, you know, speaking about the solutions, but in terms of pricing and how we can help you and all that, that's Landon.  
   
 

### 00:22:44 {#00:22:44}

   
**Benji Twerskoi:** So, Landon, I'll hand it off to you. I think  
**Landon Schlag:** Yeah.  
**Benji Twerskoi:** Rev off appropriate here, by the way.  
**Landon Schlag:** Right.  
**Benji Twerskoi:** Yep.  
**Landon Schlag:** And like you said, more of a consultative approach. Uh Sergio is kind of what you're looking for. And we do all-encompassing, you know, anything you need. Not even only each specific implementation, but we can help you with everything we went over today. Marketing, customer success, sales. Um regardless though, this is a rev revup as a service plan. Um it is a basically a monthly plan. And um how that works, it's initial three-month term. So a three-month contract. Um on the silver plan here, you get uh 10 a base order 10 per month. So you can go over if you need to, but it's at least 10 hours per month. Um that is $130 per hour. So about 1300 uh per month for our services here. It's a biouating cadence with one of our solutions architects.  
   
 

### 00:23:29

   
**Landon Schlag:** And again, as you can see here, this covers data management, marketing ops, sales ops. So basically like we said it's consultative approach all encompassing anything you need within your HubSpot. Um now for the gold plan here just so you have an idea of kind of what we're looking at. Um that would be double so 20 hours per month. Um that's base so you could certainly go over but that's at least 20 hours per month. Um you do get a lower lower uh month or hourly price for that. So it's $110 per hour. Same initial three-month contract. And this one you get a weekly median cadence and that three-month contract. What that does, it's like a test drive for you to see value with us. Um, you know, that gives you three months to, you know, get some projects done. You see some value. If you want to renew, you certainly can. Um, you're not locked into any big 12-month contract upfront. Um, but hopefully you will see the value.  
   
 

### 00:24:15

   
**Landon Schlag:** Um, and, you know, continue to work with us from there. Um, those are our two basic plans. Um, you know, we we do also have the platinum plan, you know, same concept. Um, just a more at scale. So that would be 40 base hours like a complete overhaul basically if you want someone more full-time. Um obviously you know again the more you do the lower the month or the hourly price. So $90 per hour same initial three to three months and same weekly meeting cadence. Um but based on what you're kind of explaining we typically start most of our clients out with the silver and gold because these are plan these plans are very flexible. You can always change them if you need to. They are um as needed. So if you wanted to start with silver and you know you realize you need more hours we could certainly switch  
**Sergio Viramontes:** Sure.  
**Landon Schlag:** you over to gold and whatnot. Um but those are kind of our base tiers um for our consultative revops as a service approach.  
   
 

### 00:25:02

   
**Landon Schlag:** Um does that kind of make sense how we how we set up our contracts? How we set up our services?  
**Sergio Viramontes:** So, uh, basically what you're doing is whatever service we need and so it I'm assuming you're going to send me sort of a summary of what  
**Landon Schlag:** Yeah.  
**Sergio Viramontes:** are  
**Landon Schlag:** Yeah.  
**Sergio Viramontes:** the operational uh, benefits of using CRM magnetics. How long have you guys been working with  
**Landon Schlag:** you've  
**Sergio Viramontes:** HubSpot?  
**Landon Schlag:** seen the benefits, right? We we've explained how we can help your specific pain points. So, that would be the benefit, you know,  
**Sergio Viramontes:** Yeah. So, who how long have you been working with HubSpot as as a HubSpot vendor or partner?  
**Landon Schlag:** uh almost uh one year now. We we we've been officially uh on the market for since uh starting September of 2024\. So, almost one year.  
**Sergio Viramontes:** Okay. Before working with House, did you work with any other platforms?  
**Landon Schlag:** Uh Benji's a dark start tech guy. He's been with HubSpot  
   
 

### 00:25:50 {#00:25:50}

   
**Benji Twerskoi:** I  
**Landon Schlag:** and  
**Benji Twerskoi:** can  
**Landon Schlag:** other  
**Benji Twerskoi:** answer that if you want Landon just because it's more like on the technical side of things.  
**Landon Schlag:** Yeah.  
**Benji Twerskoi:** Uh yeah. So well I I can tell you personally about me because I would be your solutions architect, right? So you would have uh um an implementation specialist in the back end who you wouldn't really kind of know but uh in certain ways you still interact with them through task assignments through our platform and whatnot but regardless uh I can speak on my experience right uh I've worked with HubSpot probably for six years something like that but I've really worked with a lot of different CRM before like specializing into HubSpot right including Zoho Pipe Drive Dynamics a lot of the difference uh um send and blue but they've rebranded to uh I forget what they brevo they're brevo now anyways but um yeah so that's what I do I'm HubSpot specialist and I would be overseeing your project  
**Sergio Viramontes:** All right, cool. All right.  
**Landon Schlag:** Yeah.  
   
 

### 00:26:47 {#00:26:47}

   
**Sergio Viramontes:** Um, and basically, so from what you heard, Benji, uh, I don't have a whole lot of, um, issues with HubSpot. Um, you know, for me, it's just about automation, uh, specifically about billing and managing that. I mean, there's other services that we can use. There's stuff that I don't know about HubSpot, right? I'm barely scratch scratching the surface. We're we're in this maybe five months, four months into the project. Um, pretty much everything that it's doing is doing better than what it were using before. Um, I wish it could be a little bit easier on on the billing side, but other than that, I have no problems with it. Um, automation wise, uh, if we could if we could find a way to do that, that'd be great. And and you're you're you're pretty confident, Benji, that we could create uh some sort of either um um what did you call it? Rules or or you called it some automation rules after you close a deal. What did you call them?  
   
 

### 00:27:46

   
**Sergio Viramontes:** There was a certain thing you  
**Benji Twerskoi:** Uh I talked about a lot of things I know calculations workflows I'm not sure but  
**Sergio Viramontes:** workflows. That's it. The workflows. Yeah. So the workflows. Um yeah, any anything that could help trigger uh billing and and all that that would be so much easier than than what we have today. So um I'm assuming that if you we were to bring you on board, you guys would help help me initiate those workflows or you would create the workflows. How was that? Are  
**Benji Twerskoi:** Okay.  
**Sergio Viramontes:** you  
**Benji Twerskoi:** So, let  
**Sergio Viramontes:** the  
**Benji Twerskoi:** me  
**Sergio Viramontes:** teacher?  
**Benji Twerskoi:** you let me I want to uh touch on a couple of things that you said there. Um so, um first of all, you were talking about um what was that first point you said? Um uh let me let me say this that you know I can't Oh, okay. I understand your situation that you you don't have any big problems your processes are working like pretty well right now right so how I I view this it's more like an agile situation right agile approach where you know we take what's already there and we iterate on it to make an improvement right so we automate it more we make it more efficient we make it more accurate and stuff like that right so that's my understanding of  
   
 

### 00:28:55 {#00:28:55}

   
**Benji Twerskoi:** your situation right now in terms of can we do it well let me tell you this right I I don't know exactly what it is until I look at it and like determine it Right. What I can say is in terms of project complexity like I've solved problems that are like really really really really complex that have many layers to many different integrations you know just now I finished a very complex seat um in uh implementation for a company essentially where they have you know big projects and three times in the project they send surveys out and first the project manager gets an email do you approve that this project gets a seat survey right he says yes I mean very complex complex stuff. So my point is that I don't know what the exact solutions are, but uh you know I I love the challenge of taking on like really complex tasks, right? And coming up with the best possible solution in a creative way, right? Can we do a custom calculation field? Can we do like a custom code field here?  
   
 

### 00:29:52 {#00:29:52}

   
**Benji Twerskoi:** Can we integrate this app? Right? So you find kind of the best way. I don't know what the exact solution is until I look at it, right? But my point is the complexity itself doesn't scare me. And you know if there's a a solution to be had then we'll find it. We'll configure it really well.  
**Sergio Viramontes:** Yeah, I think you're right. Um I think we we could take a look at it now. Um we've been talking about what we do and what my needs are and your costs. So when do I know whether or not you could do it? So I have to show you my current processes and you tell me or is that already build? I mean how do I know that you can do it? Right.  
**Benji Twerskoi:** I  
**Sergio Viramontes:** So,  
**Benji Twerskoi:** think  
**Sergio Viramontes:** let  
**Benji Twerskoi:** the  
**Sergio Viramontes:** me  
**Benji Twerskoi:** question  
**Sergio Viramontes:** let me tell you why. Let me tell you how I the reason I asked this is our solution.  
   
 

### 00:30:33 {#00:30:33}

   
**Sergio Viramontes:** I know it works, but people don't know me from Adam. I mean, there's other services that are that quote we could do what we could do. The good news is that we're we're a certified partner with Shopify and and Magento and all these other companies. You could download our app. You get 10 days of of free trial. We'll provide you support. But basically what I'm saying here is until you actually saw what I'm doing and how I do it, you can say, "Oh, that's super simple. We can solve this issue in, you know, no problem." It's still going to be, you know, uh,  
**Benji Twerskoi:** I'm  
**Sergio Viramontes:** three  
**Benji Twerskoi:** not  
**Sergio Viramontes:** months  
**Benji Twerskoi:** saying that by the way I'm not I'm not saying that right what what I'm saying is that um the question should be is it possible to do what you want not can we do it is it possible and if the answer is yes it is possible then likely it is that we can do The gap between is it possible and can we do it is not that like I'm not saying we're perfect we can do everything right but the gap is not that big. So that's why I'm saying like I I really am a subject matter expert and  
**Sergio Viramontes:** Mhm.  
**Benji Twerskoi:** I have done a lot of different implementations a lot of different problems have been solved in a lot of creative ways. So if it's possible to do it I I don't see why we can't do it  
**Sergio Viramontes:** Yeah.  
**Benji Twerskoi:** right.  
**Sergio Viramontes:** So, you've  
**Benji Twerskoi:** That's  
**Sergio Viramontes:** come across this before, right? SAS companies trying to figure out how to automate their billing.  
**Benji Twerskoi:** uh well I don't know about that specific issue what you're talking probably not I mean there there's a million iterations of different things that you know can happen but similar yes SAS definitely I mean I specialize in technology so you know the  
**Sergio Viramontes:** Yeah.  
**Benji Twerskoi:** majority of my uh HubSpot implementations have been for tech and SAS companies  
**Sergio Viramontes:** All right. Well, send send me a summary. Like I said, this is a a good start. Send me the information that you have.  
   
 

### Transcription ended after 00:32:43

*This editable transcript was computer generated and might contain errors. People can also change the text after it was created.*