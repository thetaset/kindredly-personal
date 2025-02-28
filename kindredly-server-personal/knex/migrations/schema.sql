--
-- PostgreSQL database dump
--

-- Dumped from database version 14.7 (Ubuntu 14.7-0ubuntu0.22.04.1)
-- Dumped by pg_dump version 14.7 (Ubuntu 14.7-0ubuntu0.22.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA "public";


SET default_table_access_method = "heap";

--
-- Name: access_request; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."access_request" (
    "_id" character varying(255) NOT NULL,
    "key" "text",
    "accountId" character varying(255),
    "requesterId" character varying(255),
    "requesterUsername" character varying(255),
    "status" character varying(255),
    "requesterNote" "text",
    "approverNote" "text",
    "createdAt" timestamp with time zone,
    "updatedAt" timestamp with time zone
);


--
-- Name: account; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."account" (
    "_id" character varying(255) NOT NULL,
    "userCount" integer,
    "collectionCount" integer,
    "maxUsers" integer,
    "maxCollections" integer,
    "maxItemsPerCollection" integer,
    "accountType" character varying(255),
    "options" "json",
    "deleted" boolean DEFAULT false,
    "disabled" boolean DEFAULT false,
    "stripeCustomerId" "text",
    "subscriptionInfo" "json",
    "encEnable" boolean,
    "encSettings" "json"
    "createdAt" timestamp with time zone,
    "updatedAt" timestamp with time zone,
);


--
-- Name: comment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."comment" (
    "_id" character varying(255) NOT NULL,
    "refType" character varying(255),
    "refId" character varying(255),
    "userId" character varying(255),
    "parentId" character varying(255),
    "data" "json",
    "visibility" character varying(255),
    "deletedAt" timestamp with time zone,
    "deleteReason" character varying(255),
    "editedAt" timestamp with time zone,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: contact_request; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."contact_request" (
    "_id" character varying(255) NOT NULL,
    "contactType" character varying(255),
    "userInfo" "json",
    "processed" boolean,
    "message" "text",
    "processNote" "text",
    "updatedAt" timestamp with time zone,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: event_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."event_log" (
    "_id" integer NOT NULL,
    "eventName" "text" NOT NULL,
    "eventVersion" "text",
    "eventType" "text" NOT NULL,
    "experimentId" "text",
    "source" "text",
    "eventInfo" "json",
    "clientInfo" "json",
    "anonymized" boolean DEFAULT false,
    "userId" "text",
    "accountId" "text",
    "updatedAt" timestamp with time zone
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,

);


--
-- Name: event_log__id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."event_log__id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: event_log__id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."event_log__id_seq" OWNED BY "public"."event_log"."_id";


--
-- Name: friend; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."friend" (
    "_id" character varying(255) NOT NULL,
    "accountId" "text",
    "userId" "text",
    "friendUserId" "text",
    "nickname" "text",
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "requester" boolean,
    "confirmed" boolean,
    "denied" boolean
);


--
-- Name: item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."item" (
    "_id" character varying(255) NOT NULL,
    "accountId" character varying(255),
    "key" "text",
    "userId" character varying(255),
    "name" "text",
    "description" "text",
    "comment" "text",
    "type" character varying(255),
    "visibility" character varying(255),
    "subscriptionId" character varying(255),
    "categories" "json",
    "tags" "json",
    "useCriteria" "json",
    "url" "text",
    "patterns" "json",
    "imageFilename" "text",
    "itemCount" integer,
    "updatedAt" timestamp with time zone,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "published" boolean,
    "publishId" character varying(255),
    "publishName" "text",
    "publishDescription" "text",
    "deleted" boolean,
    "publishVisibilityCode" integer,
    "publishUpdateType" "text",
    "permanent" boolean,
    "subType" "text",
    "archived" boolean
);


--
-- Name: item_feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."item_feedback" (
    "_id" character varying(255) NOT NULL,
    "itemId" character varying(255),
    "userId" character varying(255),
    "lastVisitId" character varying(255),
    "data" "json",
    "lastVisitContext" "json",
    "liked" boolean,
    "visitCount" integer,
    "visitTime" timestamp with time zone,
    "lastUpdate" timestamp with time zone,
    "lastVisit" timestamp with time zone,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp with time zone,
    "isReadLaterDate" timestamp with time zone,
    "isReadDate" timestamp with time zone,
    "reactionDate" timestamp with time zone,
    "notes" "json",
    "isArchived" timestamp with time zone,
    "reaction" character varying(255)
);


--
-- Name: item_meta; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."item_meta" (
    "_id" character varying(255) NOT NULL,
    "accountId" character varying(255),
    "key" "text",
    "meta" "json",
    "updatedAt" timestamp with time zone,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: item_relation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."item_relation" (
    "_id" character varying(255) NOT NULL,
    "accountId" character varying(255),
    "itemType" character varying(255),
    "collectionId" character varying(255),
    "itemId" character varying(255),
    "order" integer,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "details" "json",
    "userId" "text"
);


--
-- Name: key_entry; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."key_entry" (
    "_id" character varying(255) NOT NULL,
    "selectId" character varying(255),
    "selectType" character varying(255),
    "groupId" character varying(255),
    "groupType" character varying(255),
    "keyId" character varying(255),
    "keyType" character varying(255),
    "keyName" character varying(255),
    "version" character varying(255),
    "permission" character varying(255),
    "keyData" "json",
    "keyAlgo" "json",
    "keyOps" "json",
    "isWrapped" boolean,
    "wrappingKeyId" character varying(255),
    "wrappingKeyGroup" character varying(255),
    "unwrappingKeyId" character varying(255),
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" timestamp with time zone
);


--
-- Name: knex_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."knex_migrations" (
    "id" integer NOT NULL,
    "name" character varying(255),
    "batch" integer,
    "migration_time" timestamp with time zone
);


--
-- Name: knex_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."knex_migrations_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: knex_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."knex_migrations_id_seq" OWNED BY "public"."knex_migrations"."id";


--
-- Name: knex_migrations_lock; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."knex_migrations_lock" (
    "index" integer NOT NULL,
    "is_locked" integer
);


--
-- Name: knex_migrations_lock_index_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."knex_migrations_lock_index_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: knex_migrations_lock_index_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."knex_migrations_lock_index_seq" OWNED BY "public"."knex_migrations_lock"."index";


--
-- Name: notification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."notification" (
    "_id" character varying(255) NOT NULL,
    "accountId" character varying(255),
    "type" character varying(255),
    "senderId" character varying(255),
    "targetKey" character varying(255),
    "data" "json",
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: post; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."post" (
    "_id" character varying(255) NOT NULL,
    "userId" character varying(255),
    "postType" character varying(255),
    "data" "json",
    "sharedWith" "json",
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp with time zone,
    "deletedAt" timestamp with time zone
);


--
-- Name: published; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."published" (
    "_id" character varying(255) NOT NULL,
    "type" character varying(255),
    "name" "text",
    "description" "text",
    "sourceItemId" character varying(255),
    "accountId" character varying(255),
    "publicUserId" character varying(255),
    "username" character varying(255),
    "itemCount" integer,
    "categories" "jsonb",
    "useCriteria" "jsonb",
    "imageFilename" "text",
    "tableGroup" character varying(255),
    "items" "json",
    "published" boolean,
    "visibilityCode" integer,
    "curationStatus" character varying(255),
    "key" "text",
    "meta" "jsonb",
    "data" "jsonb",
    "overallRating" real,
    "numRatings" real,
    "easyId" character varying(255),
    "curated" boolean,
    "curatorId" character varying(255),
    "curatorComment" "text",
    "curatedDate" timestamp with time zone,
    "blockedAt" timestamp with time zone,
    "blockContext" "json"
    "updatedAt" timestamp with time zone,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
);


--
-- Name: published_relation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."published_relation" (
    "_id" character varying(255) NOT NULL,
    "parentId" character varying(255),
    "itemId" character varying(255),
    "order" integer,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: report_problem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."report_problem" (
    "_id" integer NOT NULL,
    "category" "text" NOT NULL,
    "details" "json",
    "sourceType" "text" NOT NULL,
    "sourceId" "text",
    "userId" "text",
    "adminStatus" character varying(255),
    "adminStatusInfo" "json",
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: report_problem__id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."report_problem__id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: report_problem__id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."report_problem__id_seq" OWNED BY "public"."report_problem"."_id";


--
-- Name: review; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."review" (
    "_id" character varying(255) NOT NULL,
    "key" character varying(255),
    "userId" character varying(255),
    "data" character varying(255),
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "publicUserId" "text",
    "publishId" "text",
    "overallRating" integer,
    "comment" "text",
    "visibilityCode" integer,
    "deletedAt" timestamp with time zone,
    "updatedAt" timestamp with time zone
);


--
-- Name: site_plugin; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."site_plugin" (
    "_id" character varying(255) NOT NULL,
    "key" "text",
    "name" "text",
    "description" "text",
    "tags" "json",
    "patterns" "json",
    "css" "json",
    "script" "json",
    "version" character varying(255),
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: sys_info; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."sys_info" (
    "_id" character varying(255) NOT NULL,
    "data" "json"
);


--
-- Name: user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."user" (
    "_id" character varying(255) NOT NULL,
    "accountId" character varying(255),
    "username" character varying(255),
    "publicId" character varying(255),
    "email" character varying(255),
    "password" character varying(255),
    "type" character varying(255),
    "options" "json",
    "userData" "json",
    "canPublishPublicly" boolean,

    "pin" character varying(128),
    "plugins" "json",
    "disabled" boolean DEFAULT false,
    "deleted" boolean DEFAULT false,
    "verified" boolean DEFAULT false,
    "dob" "json",
    "quickBarCollectionId" character varying(255),
    "pinnedItemIds" "json",
    "operationalStatus" "json",
    "loginType" "text",
    "loginId" "text",
    "profileImage" "json",
    "userInfo" "json",
    "encEnable" boolean,
    "encSettings" "json"
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp with time zone,
);


--
-- Name: user_activity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."user_activity" (
    "_id" character varying(255) NOT NULL,
    "key" "text",
    "url" "text",
    "activityType" character varying(255),
    "userId" character varying(255),
    "blocked" boolean,
    "context" "json",
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "encrypted" boolean,
    "encInfo" "json"
);


--
-- Name: user_change_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."user_change_log" (
    "id" integer NOT NULL,
    "userId" "text",
    "sourceId" "text",
    "data" "jsonb",
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: user_change_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."user_change_log_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_change_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."user_change_log_id_seq" OWNED BY "public"."user_change_log"."id";


--
-- Name: user_feed; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."user_feed" (
    "_id" character varying(255) NOT NULL,
    "userId" character varying(255),
    "refId" character varying(255),
    "refType" character varying(255),
    "isRead" boolean DEFAULT false,
    "isDeleted" boolean DEFAULT false,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: user_perm; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."user_perm" (
    "_id" character varying(255) NOT NULL,
    "userId" character varying(255),
    "itemId" character varying(255),
    "permission" character varying(255),
    "inLibrary" boolean,
    "sharedByUserId" "text",
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: user_pref; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."user_pref" (
    "_id" character varying(255) NOT NULL,
    "userId" character varying(255),
    "key" character varying(255),
    "value" "json",
    "updatedAt" timestamp with time zone
);


--
-- Name: user_public; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."user_public" (
    "_id" character varying(255) NOT NULL,
    "username" character varying(255),
    "about" "text",
    "enabled" boolean DEFAULT false,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp with time zone,
    "fullName" character varying(255),
    "curator" boolean,
    "curatorApprovalBy" character varying(255),
    "curatorApprovalDate" timestamp with time zone,
    "blockedAt" timestamp with time zone,
    "blockContext" "json",
    "profileImage" "json",
    "verifiedType" character varying(255),
    "verifiedContext" "json"
);


--
-- Name: verification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."verification" (
    "_id" character varying(255) NOT NULL,
    "data" "json",
    "code" character varying(255),
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" timestamp with time zone
);


--
-- Name: event_log _id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."event_log" ALTER COLUMN "_id" SET DEFAULT "nextval"('"public"."event_log__id_seq"'::"regclass");


--
-- Name: knex_migrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."knex_migrations" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."knex_migrations_id_seq"'::"regclass");


--
-- Name: knex_migrations_lock index; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."knex_migrations_lock" ALTER COLUMN "index" SET DEFAULT "nextval"('"public"."knex_migrations_lock_index_seq"'::"regclass");


--
-- Name: report_problem _id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."report_problem" ALTER COLUMN "_id" SET DEFAULT "nextval"('"public"."report_problem__id_seq"'::"regclass");


--
-- Name: user_change_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_change_log" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."user_change_log_id_seq"'::"regclass");


--
-- Name: access_request access_request_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."access_request"
    ADD CONSTRAINT "access_request_pkey" PRIMARY KEY ("_id");


--
-- Name: account account_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."account"
    ADD CONSTRAINT "account_pkey" PRIMARY KEY ("_id");


--
-- Name: comment comment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."comment"
    ADD CONSTRAINT "comment_pkey" PRIMARY KEY ("_id");


--
-- Name: contact_request contact_request_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."contact_request"
    ADD CONSTRAINT "contact_request_pkey" PRIMARY KEY ("_id");


--
-- Name: event_log event_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."event_log"
    ADD CONSTRAINT "event_log_pkey" PRIMARY KEY ("_id");


--
-- Name: friend friend_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."friend"
    ADD CONSTRAINT "friend_pkey" PRIMARY KEY ("_id");


--
-- Name: item_feedback item_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."item_feedback"
    ADD CONSTRAINT "item_feedback_pkey" PRIMARY KEY ("_id");


--
-- Name: item_meta item_meta_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."item_meta"
    ADD CONSTRAINT "item_meta_pkey" PRIMARY KEY ("_id");


--
-- Name: item item_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."item"
    ADD CONSTRAINT "item_pkey" PRIMARY KEY ("_id");


--
-- Name: item_relation item_relation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."item_relation"
    ADD CONSTRAINT "item_relation_pkey" PRIMARY KEY ("_id");


--
-- Name: key_entry key_entry_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."key_entry"
    ADD CONSTRAINT "key_entry_pkey" PRIMARY KEY ("_id");


--
-- Name: knex_migrations_lock knex_migrations_lock_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."knex_migrations_lock"
    ADD CONSTRAINT "knex_migrations_lock_pkey" PRIMARY KEY ("index");


--
-- Name: knex_migrations knex_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."knex_migrations"
    ADD CONSTRAINT "knex_migrations_pkey" PRIMARY KEY ("id");


--
-- Name: notification notification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."notification"
    ADD CONSTRAINT "notification_pkey" PRIMARY KEY ("_id");


--
-- Name: post post_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."post"
    ADD CONSTRAINT "post_pkey" PRIMARY KEY ("_id");


--
-- Name: published published_easyid_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."published"
    ADD CONSTRAINT "published_easyid_unique" UNIQUE ("easyId");


--
-- Name: published published_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."published"
    ADD CONSTRAINT "published_pkey" PRIMARY KEY ("_id");


--
-- Name: published_relation published_relation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."published_relation"
    ADD CONSTRAINT "published_relation_pkey" PRIMARY KEY ("_id");


--
-- Name: report_problem report_problem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."report_problem"
    ADD CONSTRAINT "report_problem_pkey" PRIMARY KEY ("_id");


--
-- Name: review review_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."review"
    ADD CONSTRAINT "review_pkey" PRIMARY KEY ("_id");


--
-- Name: site_plugin site_plugin_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."site_plugin"
    ADD CONSTRAINT "site_plugin_pkey" PRIMARY KEY ("_id");


--
-- Name: sys_info sys_info_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."sys_info"
    ADD CONSTRAINT "sys_info_pkey" PRIMARY KEY ("_id");


--
-- Name: user_activity user_activity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_activity"
    ADD CONSTRAINT "user_activity_pkey" PRIMARY KEY ("_id");


--
-- Name: user_change_log user_change_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_change_log"
    ADD CONSTRAINT "user_change_log_pkey" PRIMARY KEY ("id");


--
-- Name: user user_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user"
    ADD CONSTRAINT "user_email_unique" UNIQUE ("email");


--
-- Name: user_feed user_feed_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_feed"
    ADD CONSTRAINT "user_feed_pkey" PRIMARY KEY ("_id");


--
-- Name: user user_loginid_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user"
    ADD CONSTRAINT "user_loginid_unique" UNIQUE ("loginId");


--
-- Name: user_perm user_perm_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_perm"
    ADD CONSTRAINT "user_perm_pkey" PRIMARY KEY ("_id");


--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user"
    ADD CONSTRAINT "user_pkey" PRIMARY KEY ("_id");


--
-- Name: user_pref user_pref_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_pref"
    ADD CONSTRAINT "user_pref_pkey" PRIMARY KEY ("_id");


--
-- Name: user_public user_public_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_public"
    ADD CONSTRAINT "user_public_pkey" PRIMARY KEY ("_id");


--
-- Name: user_public user_public_username_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_public"
    ADD CONSTRAINT "user_public_username_unique" UNIQUE ("username");


--
-- Name: user user_publicid_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user"
    ADD CONSTRAINT "user_publicid_unique" UNIQUE ("publicId");


--
-- Name: user user_username_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user"
    ADD CONSTRAINT "user_username_unique" UNIQUE ("username");


--
-- Name: verification verification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."verification"
    ADD CONSTRAINT "verification_pkey" PRIMARY KEY ("_id");


--
-- Name: access_request__id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "access_request__id_index" ON "public"."access_request" USING "btree" ("_id");


--
-- Name: access_request_accountid_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "access_request_accountid_index" ON "public"."access_request" USING "btree" ("accountId");


--
-- Name: access_request_key_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "access_request_key_index" ON "public"."access_request" USING "btree" ("key");


--
-- Name: access_request_requesterid_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "access_request_requesterid_index" ON "public"."access_request" USING "btree" ("requesterId");


--
-- Name: account__id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "account__id_index" ON "public"."account" USING "btree" ("_id");


--
-- Name: account_stripecustomerid_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "account_stripecustomerid_index" ON "public"."account" USING "btree" ("stripeCustomerId");


--
-- Name: comment__id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "comment__id_index" ON "public"."comment" USING "btree" ("_id");


--
-- Name: comment_refid_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "comment_refid_index" ON "public"."comment" USING "btree" ("refId");


--
-- Name: comment_userid_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "comment_userid_index" ON "public"."comment" USING "btree" ("userId");


--
-- Name: contact_request__id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "contact_request__id_index" ON "public"."contact_request" USING "btree" ("_id");


--
-- Name: event_log_accountid_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "event_log_accountid_index" ON "public"."event_log" USING "btree" ("accountId");


--
-- Name: event_log_eventname_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "event_log_eventname_index" ON "public"."event_log" USING "btree" ("eventName");


--
-- Name: event_log_userid_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "event_log_userid_index" ON "public"."event_log" USING "btree" ("userId");


--
-- Name: friend__id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "friend__id_index" ON "public"."friend" USING "btree" ("_id");


--
-- Name: friend_accountid_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "friend_accountid_index" ON "public"."friend" USING "btree" ("accountId");


--
-- Name: friend_frienduserid_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "friend_frienduserid_index" ON "public"."friend" USING "btree" ("friendUserId");


--
-- Name: friend_userid_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "friend_userid_index" ON "public"."friend" USING "btree" ("userId");


--
-- Name: item__id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "item__id_index" ON "public"."item" USING "btree" ("_id");


--
-- Name: item_accountid_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "item_accountid_index" ON "public"."item" USING "btree" ("accountId");


--
-- Name: item_accountid_key_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "item_accountid_key_index" ON "public"."item" USING "btree" ("accountId", "key");


--
-- Name: item_accountid_subscriptionid_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "item_accountid_subscriptionid_index" ON "public"."item" USING "btree" ("accountId", "subscriptionId");


--
-- Name: item_accountid_type_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "item_accountid_type_index" ON "public"."item" USING "btree" ("accountId", "type");


--
-- Name: item_feedback__id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "item_feedback__id_index" ON "public"."item_feedback" USING "btree" ("_id");


--
-- Name: item_feedback_itemid_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "item_feedback_itemid_index" ON "public"."item_feedback" USING "btree" ("itemId");


--
-- Name: item_feedback_userid_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "item_feedback_userid_index" ON "public"."item_feedback" USING "btree" ("userId");


--
-- Name: item_key_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "item_key_index" ON "public"."item" USING "btree" ("key");


--
-- Name: item_meta__id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "item_meta__id_index" ON "public"."item_meta" USING "btree" ("_id");


--
-- Name: item_meta_accountid_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "item_meta_accountid_index" ON "public"."item_meta" USING "btree" ("accountId");


--
-- Name: item_meta_accountid_key_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "item_meta_accountid_key_index" ON "public"."item_meta" USING "btree" ("accountId", "key");


--
-- Name: item_meta_key_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "item_meta_key_index" ON "public"."item_meta" USING "btree" ("key");


--
-- Name: item_relation__id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "item_relation__id_index" ON "public"."item_relation" USING "btree" ("_id");


--
-- Name: item_relation_accountid_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "item_relation_accountid_index" ON "public"."item_relation" USING "btree" ("accountId");


--
-- Name: item_relation_collectionid_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "item_relation_collectionid_index" ON "public"."item_relation" USING "btree" ("collectionId");


--
-- Name: item_relation_collectionid_itemtype_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "item_relation_collectionid_itemtype_index" ON "public"."item_relation" USING "btree" ("collectionId", "itemType");


--
-- Name: item_relation_itemid_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "item_relation_itemid_index" ON "public"."item_relation" USING "btree" ("itemId");


--
-- Name: item_relation_itemid_itemtype_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "item_relation_itemid_itemtype_index" ON "public"."item_relation" USING "btree" ("itemId", "itemType");


--
-- Name: item_subscriptionid_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "item_subscriptionid_index" ON "public"."item" USING "btree" ("subscriptionId");


--
-- Name: key_entry__id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "key_entry__id_index" ON "public"."key_entry" USING "btree" ("_id");


--
-- Name: key_entry_selectid_selecttype_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "key_entry_selectid_selecttype_index" ON "public"."key_entry" USING "btree" ("selectId", "selectType");


--
-- Name: notification__id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "notification__id_index" ON "public"."notification" USING "btree" ("_id");


--
-- Name: notification_accountid_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "notification_accountid_index" ON "public"."notification" USING "btree" ("accountId");


--
-- Name: notification_accountid_targetkey_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "notification_accountid_targetkey_index" ON "public"."notification" USING "btree" ("accountId", "targetKey");


--
-- Name: notification_targetkey_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "notification_targetkey_index" ON "public"."notification" USING "btree" ("targetKey");


--
-- Name: post__id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "post__id_index" ON "public"."post" USING "btree" ("_id");


--
-- Name: post_userid_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "post_userid_index" ON "public"."post" USING "btree" ("userId");


--
-- Name: published__id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "published__id_index" ON "public"."published" USING "btree" ("_id");


--
-- Name: published_accountid_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "published_accountid_index" ON "public"."published" USING "btree" ("accountId");


--
-- Name: published_categories_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "published_categories_index" ON "public"."published" USING "gin" ((("categories" -> 'i'::"text")));


--
-- Name: published_curated_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "published_curated_index" ON "public"."published" USING "btree" ("curated");


--
-- Name: published_easyid_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "published_easyid_index" ON "public"."published" USING "btree" ("easyId");


--
-- Name: published_publicuserid_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "published_publicuserid_index" ON "public"."published" USING "btree" ("publicUserId");


--
-- Name: published_relation__id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "published_relation__id_index" ON "public"."published_relation" USING "btree" ("_id");


--
-- Name: published_relation_itemid_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "published_relation_itemid_index" ON "public"."published_relation" USING "btree" ("itemId");


--
-- Name: published_relation_parentid_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "published_relation_parentid_index" ON "public"."published_relation" USING "btree" ("parentId");


--
-- Name: published_text_search_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "published_text_search_index" ON "public"."published" USING "gin" ("to_tsvector"('"english"'::"regconfig", (("name" || ' '::"text") || "description")));


--
-- Name: published_usecriteria_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "published_usecriteria_index" ON "public"."published" USING "gin" ("useCriteria");


--
-- Name: report_problem_category_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "report_problem_category_index" ON "public"."report_problem" USING "btree" ("category");


--
-- Name: report_problem_sourcetype_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "report_problem_sourcetype_index" ON "public"."report_problem" USING "btree" ("sourceType");


--
-- Name: report_problem_userid_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "report_problem_userid_index" ON "public"."report_problem" USING "btree" ("userId");


--
-- Name: review__id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "review__id_index" ON "public"."review" USING "btree" ("_id");


--
-- Name: review_key_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "review_key_index" ON "public"."review" USING "btree" ("key");


--
-- Name: review_publicuserid_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "review_publicuserid_index" ON "public"."review" USING "btree" ("publicUserId");


--
-- Name: review_publicuserid_publishid_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "review_publicuserid_publishid_index" ON "public"."review" USING "btree" ("publicUserId", "publishId");


--
-- Name: review_publishid_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "review_publishid_index" ON "public"."review" USING "btree" ("publishId");


--
-- Name: review_userid_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "review_userid_index" ON "public"."review" USING "btree" ("userId");


--
-- Name: site_plugin__id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "site_plugin__id_index" ON "public"."site_plugin" USING "btree" ("_id");


--
-- Name: site_plugin_key_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "site_plugin_key_index" ON "public"."site_plugin" USING "btree" ("key");


--
-- Name: sys_info__id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "sys_info__id_index" ON "public"."sys_info" USING "btree" ("_id");


--
-- Name: user__id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "user__id_index" ON "public"."user" USING "btree" ("_id");


--
-- Name: user_accountid_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "user_accountid_index" ON "public"."user" USING "btree" ("accountId");


--
-- Name: user_activity__id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "user_activity__id_index" ON "public"."user_activity" USING "btree" ("_id");


--
-- Name: user_activity_key_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "user_activity_key_index" ON "public"."user_activity" USING "btree" ("key");


--
-- Name: user_activity_userid_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "user_activity_userid_index" ON "public"."user_activity" USING "btree" ("userId");


--
-- Name: user_change_log_userid_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "user_change_log_userid_index" ON "public"."user_change_log" USING "btree" ("userId");


--
-- Name: user_email_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "user_email_index" ON "public"."user" USING "btree" ("email");


--
-- Name: user_feed__id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "user_feed__id_index" ON "public"."user_feed" USING "btree" ("_id");


--
-- Name: user_feed_refid_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "user_feed_refid_index" ON "public"."user_feed" USING "btree" ("refId");


--
-- Name: user_feed_userid_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "user_feed_userid_index" ON "public"."user_feed" USING "btree" ("userId");


--
-- Name: user_perm__id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "user_perm__id_index" ON "public"."user_perm" USING "btree" ("_id");


--
-- Name: user_perm_itemid_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "user_perm_itemid_index" ON "public"."user_perm" USING "btree" ("itemId");


--
-- Name: user_perm_userid_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "user_perm_userid_index" ON "public"."user_perm" USING "btree" ("userId");


--
-- Name: user_pref__id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "user_pref__id_index" ON "public"."user_pref" USING "btree" ("_id");


--
-- Name: user_pref_userid_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "user_pref_userid_index" ON "public"."user_pref" USING "btree" ("userId");


--
-- Name: user_pref_userid_key_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "user_pref_userid_key_index" ON "public"."user_pref" USING "btree" ("userId", "key");


--
-- Name: user_public__id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "user_public__id_index" ON "public"."user_public" USING "btree" ("_id");


--
-- Name: user_public_username_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "user_public_username_index" ON "public"."user_public" USING "btree" ("username");


--
-- Name: user_username_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "user_username_index" ON "public"."user" USING "btree" ("username");


--
-- Name: verification__id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "verification__id_index" ON "public"."verification" USING "btree" ("_id");


--
-- Name: published published_curatorid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."published"
    ADD CONSTRAINT "published_curatorid_foreign" FOREIGN KEY ("curatorId") REFERENCES "public"."user_public"("_id");


--
-- Name: user_pref user_pref_userid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_pref"
    ADD CONSTRAINT "user_pref_userid_foreign" FOREIGN KEY ("userId") REFERENCES "public"."user"("_id");


--
-- PostgreSQL database dump complete
--
