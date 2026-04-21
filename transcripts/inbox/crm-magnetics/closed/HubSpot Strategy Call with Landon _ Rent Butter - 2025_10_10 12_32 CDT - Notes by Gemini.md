# 📝 Notes

Oct 10, 2025

## HubSpot Strategy Call with Landon | Rent Butter

Invited [Landon Schlag](mailto:landon@crmmagnetics.com) [Eric Olson](mailto:eolson@rentbutter.com)

Attachments [HubSpot Strategy Call with Landon | Rent Butter](https://www.google.com/calendar/event?eid=cmoyODc3NzhwMXU5cDc3dWFmdDl1Y2Rsc2sgbGFuZG9uQGNybW1hZ25ldGljcy5jb20) 

Meeting records [Transcript](?tab=t.knd858ear0iw) [Recording](https://drive.google.com/file/d/1k4mnqNRntZzPwkecPRylS-_uq6poU2Ry/view?usp=drive_web) 

### Summary

Eric Olson and Landon Schlag discussed optimizing HubSpot usage for a company experiencing rapid growth, which has led to challenges in engagement scoring, lifecycle automation, cross-system data sync, and forecasting. Landon Schlag proposed solutions to improve data management, lead conversion, sales pipeline optimization, and customer success, including automating lifecycle stages, implementing a weighted engagement scoring model, and enhancing churn prediction. The next step is a technical scoping call with a solutions architect to discuss detailed implementation and provide a proposal.

### Details

* **Company Background and Growth** Eric Olson, representing a company operating for about five years, explained that the company started small with two co-founders and began to rapidly expand two and a half years ago, growing from $1 million in revenue to an anticipated $7 million this year ([00:00:00](#00:00:00)). This growth has necessitated optimizing their HubSpot usage, which serves as a comprehensive system for sales, marketing, customer service, and client onboarding, to enhance seamlessness and time effectiveness ([00:00:56](#00:00:56)).

* **Current HubSpot Setup and Challenges** Landon Schlag confirmed details from a discovery form, noting that the company has 25 active HubSpot users managing 5,000 contacts, with sales cycles typically 30 days for small businesses and 90 days for enterprise clients ([00:01:43](#00:01:43)). Key performance indicators include deal close rate, LTV to CAC, faster onboarding (time to revenue), and churn prediction. Current gaps in their HubSpot setup include engagement scoring, lifecycle automation, cross-system data sync, and forecasting ([00:02:34](#00:02:34)).

* **Data Management and Lead Conversion** Eric Olson acknowledged challenges with engagement scoring and MQL to SQL conversion tracking, stating that their current system lacks clear visibility into these metrics ([00:05:50](#00:05:50)). Landon Schlag proposed automating life cycle stages to clearly track MQL to SQL conversion and implementing a weighted model for engagement scoring to prioritize sales-ready leads ([00:06:53](#00:06:53)). This would ensure clean reporting and help unlock metrics like CAC, close rate, and conversion velocity as the sales team scales ([00:07:45](#00:07:45)).

* **Sales Pipeline Optimization and Automation** Landon Schlag outlined plans to tighten the handoff from marketing to sales by automatically assigning reps, triggering alerts for re-engaged contacts, and tracking conversion rates at each stage to remove the "black hole" between marketing and sales ([00:08:31](#00:08:31)). Eric Olson confirmed they need smart automations in the sales process to avoid manual tasks and reduce time waste, especially with an anticipated surge in leads from new property management system integrations ([00:12:36](#00:12:36)).

* **Customer Success and Churn Prediction** Landon Schlag addressed churn concerns by proposing to automate the entire onboarding flow, including auto-creating tickets and tracking time to activation when a deal closes. They also suggested layering in health scoring and churn prediction by tracking logins, support tickets, and engagement to proactively identify at-risk accounts. Eric Olson affirmed that building out these proactive measures is exactly what their company needs ([00:15:12](#00:15:12)).

* **Subscription Model and Next Steps** Landon Schlag presented a subscription model for Revups as a Service, offering three tiers: Silver (10 hours/month at $130/hour), Gold (20 hours/month at $110/hour), and Platinum (40 hours/month) ([00:16:42](#00:16:42)). All tiers include an initial three-month contract. Eric Olson expressed comfort with the pricing, indicating that the Gold tier seemed appropriate for their initial needs ([00:18:15](#00:18:15)). The next step is a technical scoping call with a solutions architect to discuss detailed implementation and provide a proposal ([00:15:57](#00:15:57)) ([00:20:27](#00:20:27)).

### Suggested next steps

- [ ] Eric Olson will provide one or two analogous size businesses that Landon Schlag can chat with for 15 or 20 minutes to share their experience.  
- [ ] Landon Schlag will send Eric Olson the clutch page and a recap of everything.

*You should review Gemini's notes to make sure they're accurate. [Get tips and learn how Gemini takes notes](https://support.google.com/meet/answer/14754931)*

*Please provide feedback about using Gemini to take notes in a [short survey.](https://google.qualtrics.com/jfe/form/SV_9vK3UZEaIQKKE7A?confid=OHEhC3dFnsZ-oUVJntIlDxIOOAIIigIgABgBCA&detailid=unspecified)*

# 📖 Transcript

Oct 10, 2025

## HubSpot Strategy Call with Landon | Rent Butter \- Transcript

### 00:00:00 {#00:00:00}

   
**Eric Olson:** um, our view is, you know, you might have got hit with something on your credit score from three years ago, but if you've paid your rent for three straight years and you've got a, you know, solid job and  
**Landon Schlag:** Okay, that's good.  
**Eric Olson:** clear income and everything else, like you you still deserve to get an apartment. So, let's hope that's what that's what we're banking on.  
**Landon Schlag:** And I think there's a pretty big market for that nowadays. Um, so definitely.  
**Eric Olson:** Yeah.  
**Landon Schlag:** Are you guys new then? Like relatively new or how many years you been operating?  
**Eric Olson:** company um company started small about five years ago with our two co-founders. They they were both running their own uh other businesses at the time related type of of entities. Um and they they saw a need for this. They originally built it with like a thought that they would just run it as like a side project and then it really started taking off about about two and a half years ago now. Um, so you know about two two and a half years ago, well also let me think 2023 we did business did about a million bucks in revenue.  
   
 

### 00:00:56 {#00:00:56}

   
**Eric Olson:** Last year we did a little over two and this year on pace to do closer to seven. So yeah, so it's it's growing it's growing quickly which is great.  
**Landon Schlag:** Oh, wow. Okay.  
**Eric Olson:** I think that's part of what we're trying to manage and and partly why why we're talking today is, you know, we we effectively use HubSpot as sort of not only just our sales and marketing um uh sort of  
**Landon Schlag:** Yeah.  
**Eric Olson:** system of record, but we also use it for postale, customer service, customer support, onboarding clients, and all of that. So, um and we're growing quickly.  
**Landon Schlag:** Yeah.  
**Eric Olson:** So, we're trying to find ways to make that uh to work inside of HubSpot to make that more all more seamless uh and time, you know, effective on on our time. So, yeah, sure.  
**Landon Schlag:** Yeah. Sounds good. Well, yeah, we'll uh jump into it and uh I reviewed the discovery form. I appreciate you taking the time to fill that out, by the way. It helps us quite a bit.  
   
 

### 00:01:43 {#00:01:43}

   
**Landon Schlag:** Um so, we'll keep it focused around that. Um but it looks like you guys I mean you have a pretty solid foundation in place but right now it's just about tightening the engine around you know growth uh visibility and just overall uh efficiency inside HubSpot. Um so I'll keep this high level. I'm not the technical guy but uh we'll kind of just walk through current uh setup um what optimization would look like across you know marketing sales customer success. if it makes sense, we can schedule, you know, a technical scoping call with one of our solutions architects to map out, you know, more in detail and also like the proposal as well. So, um, yeah.  
**Eric Olson:** Okay, cool.  
**Landon Schlag:** So, based on the form, just kind of confirm real quick. So, you've got 25 active users managing about 5,000 contacts primarily lead list, PPC, and conferences.  
**Eric Olson:** Yeah, that's that's larger what we do on the sales marketing side roughly.  
**Landon Schlag:** Is that Yep. And sales cycles is usually about 30 days for small businesses and 90 days for enterprise.  
   
 

### 00:02:34 {#00:02:34}

   
**Eric Olson:** Yeah.  
**Landon Schlag:** Okay. Um, and your current KPIs, uh, obviously deal close. It looks like you want to track the LTV to C, CA C CAC, um, speed up on boarding, so like time to revenue and predict.  
**Eric Olson:** Yeah. Time this big one. Yep.  
**Landon Schlag:** Okay. And you want to predict churn as well.  
**Eric Olson:** That is exactly right. If we can if we can do those, we'll be leagues ahead of where we are today. So yeah, forecasting is a big one.  
**Landon Schlag:** Cool. And some gaps that we we're seeing potentially are um engagement scoring um automations around life cycles, cross system data sync I think is a big one and then also forecasting.  
**Eric Olson:** Yep.  
**Landon Schlag:** Okay. So yeah, those are the kind of challenges that we typically tackle for our clients. You know, these are these are pretty standard. But um anyway, definitely Brett, I'm going to share my screen here and kind of go over our systematic approach here.  
**Eric Olson:** It's pretty forward stuff.  
   
 

### 00:03:13

   
**Eric Olson:** I agree. It's usually usual stuff. I've done this this scale up thing a number of times. It's all the same challenges. Yeah.  
**Landon Schlag:** Um this is kind of our systematic framework that kind of breaks down a revoc process into four layers.  
**Eric Olson:** Yeah.  
**Landon Schlag:** Um it starts with marketing, business development, sales, and customer success, which we'll go through. Um but each layer basically builds on the one before it. um once the data and foundation and automation are in place um that way you can get full funnel visibility that drives your efficiency and obviously ROI is the main thing we're all worried about right so um marketing data foundation um well really just data in general is the foundation of your HubSpot um so we can start with that because you know everything really else everything else really depends on that um you mentioned challenges with engagement scoring  
**Eric Olson:** Mhm.  
**Landon Schlag:** uh life cycle accuracy and pulling in data from other systems so you guys do you guys currently I'm assuming you would use some sort of data enrichment at the moment or well so there's sales intelligence tools such as  
   
 

### 00:04:06

   
**Eric Olson:** Uh so tell me more like what do you mean by data enrichment?  
**Landon Schlag:** Apollo and Zoom info that enrich all your contact and so like it automatically fills in a company contact details industry portfolio size revenue so segmentation and reporting are precise right so you have the um correct information you need  
**Eric Olson:** Yeah.  
**Landon Schlag:** for your ICP um for reporting and um so basically Yeah.  
**Eric Olson:** I'm assuming we do. I couldn't tell you exactly what those are. I'd have to talk to my my uh counterpart on the sales side for that. But um I I know we do have you know from a sales perspective we do have our leads broken out by we typically break them out as SMB or enterprise kind of like our big cut and that just  
**Landon Schlag:** Right.  
**Eric Olson:** for us for what it's worth that that's based on the number of doors that a client has. So just number of units is another way to think of that. We just use the term doors for shorthand but um and then we just have like our kind of cut off of whether it's enterprise or not.  
   
 

### 00:04:56

   
**Landon Schlag:** Yeah.  
**Eric Olson:** So um so I know we're doing that.  
**Landon Schlag:** Okay.  
**Eric Olson:** I know we do buy lead lists that have a lot of that sort of specific data um as well. But yeah, at some point like to your point if we, you know, want to do that secondary sort of call where we get some more detail, what I would do is, you know, I'll get my sales counterpart on here and some other folks that can give some more more detail.  
**Landon Schlag:** Right? Because what this would do, just be more specific about it, it would take all your contacts and companies and keep them up to date and accurate with all the most up-to-date information. Um, so that way you can contact them effectively. So it really just enriches your data within your HubSpot and it does it automatically.  
**Eric Olson:** Yep. Okay.  
**Landon Schlag:** So the nice thing is it's all automated.  
**Eric Olson:** Okay.  
**Landon Schlag:** Um which is obviously important. Uh life cycle stages obviously you guys use life cycle stages. Um does it automatically advance leads from MQL to SQL opportunity and customer success based on behaviors?  
   
 

### 00:05:50 {#00:05:50}

   
**Landon Schlag:** Um  
**Eric Olson:** That is a great question. No is the answer to that question. And and the other piece to that is I don't know if I put it on the um the form that I filled out prior to coming on the call, but we do not like one thing we actually need to do is is be able to very clearly show MQL to SQL conversion in HubSpot. We don't have that today. Like if I ask our head of marketing, which I did, what the MQL to SQL conversion is, it's like we got to go like look it up and do some math, you know, like we don't just have answer.  
**Landon Schlag:** Right.  
**Eric Olson:** Um and similarly if you even if you go kind of back a step from there we don't have clarity around like the touch rate of MQLs. So like in my past business like the past business I was running we had all like we built all that right.  
**Landon Schlag:** Mhm.  
**Eric Olson:** So we had it where you could say like any given week okay like you know 95% of MQLs had were contacted you know MQL to SQL conversion was you know 20% or whatever right like we could just see that really clearly in the CRM instance we had right now at this company we do not have any of that visibility you're telling me Yeah.  
   
 

### 00:06:53 {#00:06:53}

   
**Landon Schlag:** That is very important um because that helps you track it. You can measure the yeah you want to be able to measure the MQL to SQL conversion of course um that goes without saying. So um the way we automate our life cycle stages that would be we'll definitely get that taken care of. So um that's very important.  
**Eric Olson:** Okay.  
**Landon Schlag:** Uh engagement scoring. So do you guys have like a weighted model around activities? So like form fills, site visits, email opens, demos to rank intent and hand off leads that are ready.  
**Eric Olson:** No, we don't have really have the sophistication around that.  
**Landon Schlag:** Okay. So that's important for targeting and prioritizing your your most important clients or your most sales ready clients, right?  
**Eric Olson:** We need especially now. Now I mean because I'll give you a sense like our sales team at present is four people. How it's structured is we have two I don't know if I remember I read this on the forum but we have two BDRs. Um their their job pretty typical right is to set meetings for the sales folks and we have our CRO who's still kind of player coach like we'll close deals and handle things too and then uh he's got like  
   
 

### 00:07:45 {#00:07:45}

   
**Landon Schlag:** Mhm.  
**Eric Olson:** a lieutenant. So we have kind of two sales people two BDRs. Um we're obviously growing that. So, we've got two open roles for BDRs right now and like we're going to keep doing that. So, to your point, what you're talking about here is going to be increasingly important as we add more people to the sales team. Like, we're going to need have, you know, have all this stuff in place.  
**Landon Schlag:** Right.  
**Eric Olson:** That's why I'm starting to like think about it now. I'm hoping we're getting ahead of it a little bit here.  
**Landon Schlag:** Right. Yeah. As you scale, these are foundational. Um, you know, this is going to help unlock, you know, the clean reporting for not only your CAC, but also close rate, conversion velocity, everything like that.  
**Eric Olson:** Yeah. Yeah.  
**Landon Schlag:** So, um, yeah, that's the foundation, which is very important because everything else builds on top of that.  
**Eric Olson:** Yep. Yep.  
**Landon Schlag:** Uh, business development, uh, we can go in a little bit.  
   
 

### 00:08:31 {#00:08:31}

   
**Landon Schlag:** Um, so from there, we tighten the handoff from marketing to sales. So um right now you mentioned no I mean I guess no real visibility into MQL touch rate or follow up efficiency. Um so with that process how we can automate that is we can assign reps automatically once a lead hits like an MQL threshold uh trigger instant alerts when a contact re-engages or visits pricing uh and track and report  
**Eric Olson:** Mhm.  
**Landon Schlag:** conversion rates at each stage so you know where the conversion rates at each stage are.  
**Eric Olson:** Yeah, that's what Yeah, that's great.  
**Landon Schlag:** Um but yeah that will remove that kind of that black hole between marketing and sales and that gives you qu uh you know like quantifiable MQL to SQL data. So Mhm.  
**Eric Olson:** I mean, my last business we we were using Dynamics. So, like HubSpot's new to me. I have extensive Salesforce background and my we had Dynamics. But in Dynamics, we had built out something similar to what you're talking about where based on different engagements on our site or for to your point form fills or webinar visits or whatever, we we'd be doing lead scoring  
   
 

### 00:09:13

   
**Landon Schlag:** Yeah.  
**Eric Olson:** basically and then kicking stuff over to the sales team that was sort of hot leads, right? So, sounds like that's what we're talking about here.  
**Landon Schlag:** Right. Yeah. And Salesforce is very robust. I mean, HubSpot's nice, right? But Salesforce is very enterprise. So, I'm guessing that that was at a bigger company that you were working with.  
**Eric Olson:** Yeah. like a couple companies ago for like three companies in a row as like larger businesses, but we were all in Salesforce and I know for Ow.  
**Landon Schlag:** Yeah. And HubSpot, I would say, is yeah, a good a good middle ground. And actually, they're adding I mean, with the with AI nowadays, I mean, they're adding so much to it. So, HubSpot is growing, but HubSpot is kind of a good middle ground and it definitely can cover quite a bit as you've seen. I mean, but um is important to get the most out of it because um you know, you want to make sure it's efficient.  
   
 

### 00:10:04

   
**Landon Schlag:** So anyway, um so yeah, that's that's going to help with uh marketing and sales, you know, kind of some more clear communication there.  
**Eric Olson:** Yeah.  
**Landon Schlag:** And then for sales pipeline optimization, um so do you guys use I mean well I'm assuming you obviously use a sellers dashboard currently. um is that pretty well you don't you're working on the forecasting but um basically each stage so let's say demo booked proposal sent you know active evaluation closed this gets automated with probabilities tasks and alerts so that way there's no like more manual updates there's no missed follow-ups um forecasting by source by rep by product type um you know time and stage reporting so you can see exactly where deals stall and how that affects your 30 diver your 30-day cycles like versus your 90day cycles so you can kind of see how that affects that and attribute it.  
**Eric Olson:** Yeah.  
**Landon Schlag:** Um and from there what we do is we build sales dashboards that show win rate um like we said sales velocity and projected MR. So you can finally you know you can forecast the growth against LTV versus CAC um and not be so gray in that area.  
   
 

### 00:11:03

   
**Eric Olson:** Mhm. Yep.  
**Landon Schlag:** Um so yeah that's the sales portion of it. BD that's kind of the same you know business development sales. Um, do you guys have any issue with lead generation at all or is that of course.  
**Eric Olson:** Oh, I mean, I think we always want more leads, but but uh right now I So, I would say uh right now we're we're early innings on I think tightening up our processes around lead genen. So, I mean any we can certainly hear if there's if there's more we could be doing or help we could get.  
**Landon Schlag:** Mhm.  
**Eric Olson:** They were all ears.  
**Landon Schlag:** Yeah. I mean the reason I bring that up is because um you know some agencies they I mean that's the number one thing they need to work worry about first you know getting leads in rather than you know what they currently have but I mean you do have a pretty decent setup already and I think you have a decent amount of clients but um we do have lead genen um uh market or marketing teams that we work  
   
 

### 00:11:48

   
**Eric Olson:** Yeah.  
**Landon Schlag:** with and they basically what they do is like the way I set up this call or this call with you through the email they could do that as well for your clients. I don't know if that makes sense if that exactly bridges over in the way you do it, but wouldn't hurt, you know, to maybe look into if you want more marketing qualified leads coming in. And these ones are  
**Eric Olson:** Yeah.  
**Landon Schlag:** targeted as you can see, right?  
**Eric Olson:** Yeah.  
**Landon Schlag:** You're you're our ex exact ICP, right?  
**Eric Olson:** Yep.  
**Landon Schlag:** So this would be, you know, just transfer that to to your business, you know?  
**Eric Olson:** Yeah. I would say um let's let's like well we should put a pin in that but like I don't want to forget that that's there. But let's let's I think that's probably secondary to just right now for us to getting all this stuff built out.  
**Landon Schlag:** Of course.  
**Eric Olson:** Um there's a whole bunch of reasons why I'm saying that.  
**Landon Schlag:** Right.  
**Eric Olson:** One one key reason just for for your knowledge is um for us like qualified leads and so forth really depend on like what uh what larger property management systems were integrated with and we're about to integrate with two  
   
 

### 00:12:36 {#00:12:36}

   
**Landon Schlag:** Mhm.  
**Eric Olson:** new ones. So I think we're going to have based on what typically happens when we do a new integration, we're going to have like a ton of leads just from that. um being in that market.  
**Landon Schlag:** Right. That's fair.  
**Eric Olson:** So because there's a lot of customers that we've had to put on hold basically because we're not integrated with their PMS.  
**Landon Schlag:** Mhm.  
**Eric Olson:** Uh so so I think we're going to be good on on like leads for a while. I mean our sales team's likely to be overwhelmed but it's so it's more important for us I think to do all the stuff you've been talking about which is how do we do all these like smart automations in the sales process so that they're not wasting a bunch of time manually do moving things through sales pipelines and all of that.  
**Landon Schlag:** Right. Yeah. Manual. Manual is a bad word. Everything should be automated completely.  
**Eric Olson:** Yeah, 100%.  
**Landon Schlag:** And the nice thing too about when we right yeah our goal is to generate more revenue and make everything you know efficient.  
   
 

### 00:13:29

   
**Eric Olson:** That's how we feel about our product, too. We're like trying to like make it easy for tenants to go through it, right? Like it should be as easy as possible. So, Uh,  
**Landon Schlag:** Nothing manual. Um and uh yeah so oh one other thing I want to just add real quick just for customer success because I know you mentioned about churn. Um so obviously this is a big part for your team. Um you mentioned you guys only recognize revenue once clients are live on the platform. Is that your current issue?  
**Eric Olson:** so no, that's not well it's I think it's just part of doing business, but I think that's where like this time to revenue piece comes in where we're trying to onboard. So to give you like 60 seconds of background on that.  
**Landon Schlag:** Yeah. Mhm.  
**Eric Olson:** So, so say we get a large property management company, they've got, I don't know, make it up, they got 50,000 doors or whatever, right? So to get them on, first thing they're going to do is start working with somebody on our onboarding team.  
   
 

### 00:14:22

   
**Eric Olson:** What that person's going to do is largely like make sure the systems integration gets completed.  
**Landon Schlag:** Mhm.  
**Eric Olson:** And I mean, I'm oversimplifying here, but do that and then make sure that the team, the leasing team at the property management company is trained on how to do screenings and so forth with our product.  
**Landon Schlag:** Mhm. Mhm.  
**Eric Olson:** So, we're going to train on our process and then we're going to go live. And the only we only get paid when the end client runs a screening. So we get paid every time that happens. So that's why we're looking at like, oh, if we look at this onboarding piece, we've signed the deal, we know how much it's worth annually to us because we know how many doors they have and we can predict how how much they're going to screen, but we don't actually get our first dollar in until they go through that onboarding onboarding process and they do their first screening.  
**Landon Schlag:** Mhm. Gotcha. Okay. Well, just kind of go over kind of how we could help.  
   
 

### 00:15:12 {#00:15:12}

   
**Landon Schlag:** Um, so we'd automate the entire onboarding flow, obviously.  
**Eric Olson:** Sure.  
**Landon Schlag:** Um so when a deal closes for this is just an example but for when a deal closes HubSpot can auto create an onboarding ticket and you can assign it and then it tracks the time to activation. Um that gives you measurable time to revenue metric and u then obviously we layer in health scoring and turn prediction tracking login support tickets and engagement to flag accounts to risk before turnurn happens.  
**Eric Olson:** Yep. Perfect.  
**Landon Schlag:** You know that's kind of the main thing.  
**Eric Olson:** Yep.  
**Landon Schlag:** Um, so yeah, that's kind of how we we can be more reactive rather than reactive, sorry, proactive rather than reactive, right?  
**Eric Olson:** Yeah. Yeah. No, that's that's what we need to build out for sure. Like that's what exactly what you're describing is what we need to do.  
**Landon Schlag:** Yeah, perfect. Um, so yeah, that's kind of our model there and I I kept it pretty tight and focused on what you specifically outlined so we don't waste time on extra stuff.  
   
 

### 00:15:57 {#00:15:57}

   
**Landon Schlag:** Um, the solutions architect is very technical, so we can dive in really more a lot deeper with you on this stuff. Again, I was just going over high level how we can help.  
**Eric Olson:** Mhm.  
**Landon Schlag:** Um, so that's the next step. But before we do that, um, just want to go down here and I think you understand obviously the ROI of this, but I'll just kind of briefly go over that. Um, you know, so I mean marketing leads, right?  
**Eric Olson:** Yeah.  
**Landon Schlag:** When you have marketing, the foundation taken care of when you, you know, the way we described it, you know, you you can expect 15 to 30% more qualified leads handed to sales. So obviously that helps generate more revenue. um for your sales pipeline, 20 to 35% higher conversion rate, faster closes, um and client retention. So, 10 to 20% higher retention and expansion revenue. I just want to go over that briefly. I won't go into it too much. I know you're a smart guy. You understand this is you know these numbers will help.  
   
 

### 00:16:42 {#00:16:42}

   
**Eric Olson:** I hope so. Yeah.  
**Landon Schlag:** Okay. And then u let's go into our subscription model just so uh moving forward you kind of understand how our engagement looks.  
**Eric Olson:** Yeah.  
**Landon Schlag:** Um so this is Revups as a service. So everything we talked about today is included, right? So it's all-encompassing.  
**Eric Olson:** Mhm.  
**Landon Schlag:** Um, we do have uh three tiers here. We have a silver tier, gold tier, and platinum.  
**Eric Olson:** Yep.  
**Landon Schlag:** Basic subscription model. As you can see here, silver is a base of 10 hours per month. You could certainly go over that, but it's at least 10\. Base hour, sorry, the base hourly uh rate is $130 per hour. Um, it's an initial three-month contract. So, the nice thing is is there's no huge long contract up front, but it is three months that that gives you some value, some automations in place um and uh kind of go from there.  
**Eric Olson:** Mhm.  
**Landon Schlag:** It is a bi-week meeting cadence.  
**Eric Olson:** Yeah.  
**Landon Schlag:** We do have the goal plan, which might make more sense because you have a few different things you want done.  
   
 

### 00:17:29

   
**Landon Schlag:** Um, and that'd be 20 hours per month, the base of 20 hours per month, 110 per hour. Um, same initial three-month sprint, and then a weekly meeting cadence. Um, platinum, that's more intensive, probably overkill for your scope of work, but just so you're aware, it is an option. 40 hours per month if you want everything done right away kind of thing.  
**Eric Olson:** Mhm.  
**Landon Schlag:** Um, and same same exact thing, three months, weekly meeting cadence. And then um lastly, this is more for one-off projects or ongoing support. You know, in the future, six months down the road, a year down the road. Um base of $150 per hour. Whenever you need us, you you submit a ticket on our website and uh kind of describe your project you want done or what issue you're having. Then we have someone jump in real quick. Um but no contract there. Um but based on your situation, I probably recommend some sort of either the silver or gold. Um so we can build up everything in the beginning right away.  
   
 

### 00:18:15 {#00:18:15}

   
**Landon Schlag:** And the nice thing about a lot of these things is once they're set up, the automations, they build they build on themselves. So they they basically take care of themselves once it's set up.  
**Eric Olson:** Mhm.  
**Landon Schlag:** Um so we clean up everything, give you more visib visibility, help with enrichment, help with um churn, all the things we talked about today and then build on top of that from there.  
**Eric Olson:** Yeah.  
**Landon Schlag:** Um is the pricing scaring you at all? I mean that's this is I promise we are very fairly priced but is that I mean is this pretty what you were expecting? I mean yeah it's Yeah, it'd be at least 60 hours over three months.  
**Eric Olson:** Yeah. Yeah. No, this doesn't this doesn't scare me at all. No. And I I think to your point like it like to your point like this gold sort of thing at least for three months seems to that got about right.  
**Landon Schlag:** You know, you you can certainly do more, you know, and oh, by the way, let me add that.  
   
 

### 00:18:56

   
**Eric Olson:** Yeah.  
**Landon Schlag:** Let me go over to that. Um, this client portal. So, this gives you full visibility into it. So, if you you know, we're going to give you the exact well, so we would first plan off everything in the kickoff call, but we'll give you the exact timeline for each implementation, when you can expect it, the  
**Eric Olson:** Cool.  
**Landon Schlag:** results you can expect from it. You can give feedback in there. If you say, "Hey, I really need this done quick or this," you know, you can put that in there as well. So, you can you can you can basically manage how fast or quick we get things done and what's your biggest priority, which we will map out beforehand, but you know, things do change, you know, during it. Um, and the nice thing too is we'll be getting feedback as well from how our reporting is going or stuff like that because once we start setting the stuff up, you know, we do get feedback on the analytics,  
**Eric Olson:** Sure.  
**Landon Schlag:** on the data, you know, because and how we set it up so then we can best, you know, prioritize from there what makes sense.  
   
 

### 00:19:44

   
**Landon Schlag:** Um because obviously you know we don't have an exa exact idea until we look into your HubSpot until we see how it starts going.  
**Eric Olson:** Mhm.  
**Landon Schlag:** Um again this was more high level um the technical guy will definitely dig in and answer any questions you have specifically um from here. Any questions about what I went over though today at all?  
**Eric Olson:** No, I mean this seems pretty straightforward. I mean one one question not related to what what you went over but would helpful for me just in my sort of evaluation just sort of getting comfortable here is if like if you've got any like analogous size  
**Landon Schlag:** Yeah.  
**Eric Olson:** businesses that work with you guys like one or two of them that would chat with me for 15 or 20 minutes and just say here here is our experience like we think it's great because or whatever.  
**Landon Schlag:** Yeah.  
**Eric Olson:** I think it would be helpful for me just to hear from a couple other folks in my position um how things have gone and and so forth just to get comfort.  
   
 

### 00:20:27 {#00:20:27}

   
**Landon Schlag:** Yeah. Right. Yeah. We just had a It's bring that up. We just had a a customer success call with one of our clients and they offered to put their logo on our website. They offered to take calls with clients. They offered to leave two reviews and we said just one is fine because we don't want two from the same company. Um so yeah, we can definitely do that. We also have a clutch page as well I can send over. Um and I will recap everything for you as well.  
**Eric Olson:** Cool.  
**Landon Schlag:** Um and send that over to you. Um but the next step here would be the proposal and full scoping and proposal. Um about half an hour or so with one of our solutions architects.  
**Eric Olson:** Yep.  
**Landon Schlag:** Do you happen to know your availability for a call with them? And I I have their calendar up here as well. So if you want to let me know what's most convenient, I can pop it in here quick.  
   
 

### 00:21:15

   
**Eric Olson:** Let's take a look. Um I think next week they got a lot of availability Friday. Uh, well, let's not do that. Um, we got a board meeting midweek next week, so I'm just trying to like work around that.  
**Landon Schlag:** No worries.  
**Eric Olson:** How about Yes, exactly.  
**Landon Schlag:** And you're on you're on central time obviously, correct?  
**Eric Olson:** Yeah. Um, like right now I could say like any, you know, if there was a time between 10:30 central to like 1:00 central. Actually, let me take let me take that back. Let me I'm just clearing this out here. Actually, I don't have this other meeting. So on the 22nd of October, you could pretty much anytime after 10:30 in the morning, Central time, I'm open.  
**Landon Schlag:** 22nd of October.  
**Eric Olson:** So there.  
**Landon Schlag:** Okay. So, Wednesday the 22nd, uh, noon.  
**Eric Olson:** Yeah.  
**Landon Schlag:** Do you like noon appointments? Is that Is that what?  
**Eric Olson:** Uh yeah, we can Let's Let's hold. Let me I'm going to do this right now.  
   
 

### 00:22:09

   
**Eric Olson:** Let me just um Cool.  
**Landon Schlag:** And I'll I'll send you an invitation as well, so you'll have that. Um, yeah, I was going to say I was just going to ask if there any other stakeholders or any other users you'd want in there.  
**Eric Olson:** Let me just check. All I'm checking here is just I want to make sure that I can get the other guys in here for this Perfect.  
**Landon Schlag:** Um, because they'll definitely learn quite a bit from from our solutions architect as well, not only best practices, but h how that this would look. So, I can add in the emails right now if you'd like.  
**Eric Olson:** Um, all right. So, if I'm going to add the other guys in here, if you it's if it's possible. Yeah, I was thinking timewise like what I'm looking at here with everybody's schedules for the 22nd is it looks like uh I don't know if you guys can do 2:30 p.m. Central, but that's open for all of us.  
**Landon Schlag:** Yep, I got it. Here we have a 121 230\. If 2:30 works.  
   
 

### 00:22:58

   
**Eric Olson:** All right, 2:30 it is.  
**Landon Schlag:** Um, sounds good. Would you like me to add them in right away here in the invitation?  
**Eric Olson:** Sure. Yeah, it's um so the first email is a D as in dog. A S as in Sally that rent butter and then Adas basically.  
**Landon Schlag:** So at rent or 88 yeah at rent.com and hours.  
**Eric Olson:** Yeah. Arun name. Yeah. Adas. Yep. Yep. And then we've got Michael Brown is just M. Brown. And then we got Mike Raboski. That's always a fun one. So M W E R B as in boy. O W S K Y. So M robot.  
**Landon Schlag:** Could you just confirm that with me real quick?  
**Eric Olson:** Yeah, let me take a look here. Oh, I can't see it on your screen. I don't know where it would be.  
**Landon Schlag:** Oh.  
**Eric Olson:** Sorry.  
**Landon Schlag:** Uh, okay.  
**Eric Olson:** Still see the transform your HubSpot deal. Yep, that's it.  
   
 

### 00:23:59

   
**Landon Schlag:** At rent butter and Okay.  
**Eric Olson:** Uh, yep, that's right. My last name is Owen. I know it's a pain. It's usually, but yeah, for me it's Owen.  
**Landon Schlag:** Oh, it's Oh, it's Owen.  
**Eric Olson:** Yeah. No, it's all good. It's the story of my life. Uh, mine is just E Olsen at rent.  
**Landon Schlag:** Oh, listen.  
**Eric Olson:** Yeah, that's why I wanted to tell you because otherwise you get that last name wrong, no one's getting that email.  
**Landon Schlag:** Okay. And I'll add myself in here because this is his link.  
**Eric Olson:** Okay, let's see.  
**Landon Schlag:** Okay. So, everything looks correct there.  
**Eric Olson:** M Brown. Yeah,  
**Landon Schlag:** Okay. Perfect. And Wednesday 22nd at 2:30. Confirm. Eric, it's been a pleasure. I'm glad we found a few ways we're going to definitely probably help. Um, and then like I said, I'll be in touch with the recap of everything. So, the full scope we went over and then obviously next steps. Um, if you have any questions in the meantime, feel free to reach back out, give me a call or call or email anytime. Um, but yeah, that's all I have for you for now. Anything else you want to go over before I let you go here?  
**Eric Olson:** no, no, appreciate appreciate the call and and the thorough nature of  
**Landon Schlag:** No worries. No worries. Same.  
   
 

### Transcription ended after 00:25:29

*This editable transcript was computer generated and might contain errors. People can also change the text after it was created.*