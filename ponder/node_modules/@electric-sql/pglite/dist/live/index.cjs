"use strict";var Y=Object.defineProperty;var fe=Object.getOwnPropertyDescriptor;var me=Object.getOwnPropertyNames;var ye=Object.prototype.hasOwnProperty;var ne=e=>{throw TypeError(e)};var he=(e,t)=>{for(var n in t)Y(e,n,{get:t[n],enumerable:!0})},ge=(e,t,n,s)=>{if(t&&typeof t=="object"||typeof t=="function")for(let r of me(t))!ye.call(e,r)&&r!==n&&Y(e,r,{get:()=>t[r],enumerable:!(s=fe(t,r))||s.enumerable});return e};var be=e=>ge(Y({},"__esModule",{value:!0}),e);var J=(e,t,n)=>t.has(e)||ne("Cannot "+n);var i=(e,t,n)=>(J(e,t,"read from private field"),n?n.call(e):t.get(e)),M=(e,t,n)=>t.has(e)?ne("Cannot add the same private member more than once"):t instanceof WeakSet?t.add(e):t.set(e,n),I=(e,t,n,s)=>(J(e,t,"write to private field"),s?s.call(e,n):t.set(e,n),n),C=(e,t,n)=>(J(e,t,"access private method"),n);var K=(e,t,n,s)=>({set _(r){I(e,t,r,n)},get _(){return i(e,t,s)}});var ut={};he(ut,{live:()=>ot});module.exports=be(ut);function U(e){let t=e.length;for(let n=e.length-1;n>=0;n--){let s=e.charCodeAt(n);s>127&&s<=2047?t++:s>2047&&s<=65535&&(t+=2),s>=56320&&s<=57343&&n--}return t}var g,b,V,Q,k,T,W,F,re,P=class{constructor(t=256){this.size=t;M(this,T);M(this,g);M(this,b,5);M(this,V,!1);M(this,Q,new TextEncoder);M(this,k,0);I(this,g,C(this,T,W).call(this,t))}addInt32(t){return C(this,T,F).call(this,4),i(this,g).setInt32(i(this,b),t,i(this,V)),I(this,b,i(this,b)+4),this}addInt16(t){return C(this,T,F).call(this,2),i(this,g).setInt16(i(this,b),t,i(this,V)),I(this,b,i(this,b)+2),this}addCString(t){return t&&this.addString(t),C(this,T,F).call(this,1),i(this,g).setUint8(i(this,b),0),K(this,b)._++,this}addString(t=""){let n=U(t);return C(this,T,F).call(this,n),i(this,Q).encodeInto(t,new Uint8Array(i(this,g).buffer,i(this,b))),I(this,b,i(this,b)+n),this}add(t){return C(this,T,F).call(this,t.byteLength),new Uint8Array(i(this,g).buffer).set(new Uint8Array(t),i(this,b)),I(this,b,i(this,b)+t.byteLength),this}flush(t){let n=C(this,T,re).call(this,t);return I(this,b,5),I(this,g,C(this,T,W).call(this,this.size)),new Uint8Array(n)}};g=new WeakMap,b=new WeakMap,V=new WeakMap,Q=new WeakMap,k=new WeakMap,T=new WeakSet,W=function(t){return new DataView(new ArrayBuffer(t))},F=function(t){if(i(this,g).byteLength-i(this,b)<t){let s=i(this,g).buffer,r=s.byteLength+(s.byteLength>>1)+t;I(this,g,C(this,T,W).call(this,r)),new Uint8Array(i(this,g).buffer).set(new Uint8Array(s))}},re=function(t){if(t){i(this,g).setUint8(i(this,k),t);let n=i(this,b)-(i(this,k)+1);i(this,g).setInt32(i(this,k)+1,n,i(this,V))}return i(this,g).buffer.slice(t?0:5,i(this,b))};var d=new P,we=e=>{d.addInt16(3).addInt16(0);for(let s of Object.keys(e))d.addCString(s).addCString(e[s]);d.addCString("client_encoding").addCString("UTF8");let t=d.addCString("").flush(),n=t.byteLength+4;return new P().addInt32(n).add(t).flush()},_e=()=>{let e=new DataView(new ArrayBuffer(8));return e.setInt32(0,8,!1),e.setInt32(4,80877103,!1),new Uint8Array(e.buffer)},Ee=e=>d.addCString(e).flush(112),Ae=(e,t)=>(d.addCString(e).addInt32(U(t)).addString(t),d.flush(112)),Te=e=>d.addString(e).flush(112),Re=e=>d.addCString(e).flush(81),Se=[],Ie=e=>{let t=e.name??"";t.length>63&&(console.error("Warning! Postgres only supports 63 characters for query names."),console.error("You supplied %s (%s)",t,t.length),console.error("This can cause conflicts and silent errors executing queries"));let n=d.addCString(t).addCString(e.text).addInt16(e.types?.length??0);return e.types?.forEach(s=>n.addInt32(s)),d.flush(80)},G=new P;var Le=(e,t)=>{for(let n=0;n<e.length;n++){let s=t?t(e[n],n):e[n];if(s===null)d.addInt16(0),G.addInt32(-1);else if(s instanceof ArrayBuffer||ArrayBuffer.isView(s)){let r=ArrayBuffer.isView(s)?s.buffer.slice(s.byteOffset,s.byteOffset+s.byteLength):s;d.addInt16(1),G.addInt32(r.byteLength),G.add(r)}else d.addInt16(0),G.addInt32(U(s)),G.addString(s)}},Ce=(e={})=>{let t=e.portal??"",n=e.statement??"",s=e.binary??!1,r=e.values??Se,l=r.length;return d.addCString(t).addCString(n),d.addInt16(l),Le(r,e.valueMapper),d.addInt16(l),d.add(G.flush()),d.addInt16(s?1:0),d.flush(66)},De=new Uint8Array([69,0,0,0,9,0,0,0,0,0]),Ne=e=>{if(!e||!e.portal&&!e.rows)return De;let t=e.portal??"",n=e.rows??0,s=U(t),r=4+s+1+4,l=new DataView(new ArrayBuffer(1+r));return l.setUint8(0,69),l.setInt32(1,r,!1),new TextEncoder().encodeInto(t,new Uint8Array(l.buffer,5)),l.setUint8(s+5,0),l.setUint32(l.byteLength-4,n,!1),new Uint8Array(l.buffer)},Me=(e,t)=>{let n=new DataView(new ArrayBuffer(16));return n.setInt32(0,16,!1),n.setInt16(4,1234,!1),n.setInt16(6,5678,!1),n.setInt32(8,e,!1),n.setInt32(12,t,!1),new Uint8Array(n.buffer)},Z=(e,t)=>{let n=new P;return n.addCString(t),n.flush(e)},Oe=d.addCString("P").flush(68),ve=d.addCString("S").flush(68),Be=e=>e.name?Z(68,`${e.type}${e.name??""}`):e.type==="P"?Oe:ve,xe=e=>{let t=`${e.type}${e.name??""}`;return Z(67,t)},Pe=e=>d.add(e).flush(100),$e=e=>Z(102,e),j=e=>new Uint8Array([e,0,0,0,4]),Ue=j(72),Fe=j(83),Ve=j(88),ke=j(99),q={startup:we,password:Ee,requestSsl:_e,sendSASLInitialResponseMessage:Ae,sendSCRAMClientFinalMessage:Te,query:Re,parse:Ie,bind:Ce,execute:Ne,describe:Be,close:xe,flush:()=>Ue,sync:()=>Fe,end:()=>Ve,copyData:Pe,copyDone:()=>ke,copyFail:$e,cancel:Me};var Rt=new ArrayBuffer(0);var qe=1,We=4,pn=qe+We,dn=new ArrayBuffer(0);var Qe=globalThis.JSON.parse,je=globalThis.JSON.stringify,se=16,ae=17;var ie=20,He=21,ze=23;var H=25,Xe=26;var oe=114;var Ye=700,Je=701;var Ke=1042,Ze=1043,et=1082;var tt=1114,le=1184;var nt=3802;var rt={string:{to:H,from:[H,Ze,Ke],serialize:e=>{if(typeof e=="string")return e;if(typeof e=="number")return e.toString();throw new Error("Invalid input for string type")},parse:e=>e},number:{to:0,from:[He,ze,Xe,Ye,Je],serialize:e=>e.toString(),parse:e=>+e},bigint:{to:ie,from:[ie],serialize:e=>e.toString(),parse:e=>{let t=BigInt(e);return t<Number.MIN_SAFE_INTEGER||t>Number.MAX_SAFE_INTEGER?t:Number(t)}},json:{to:oe,from:[oe,nt],serialize:e=>typeof e=="string"?e:je(e),parse:e=>Qe(e)},boolean:{to:se,from:[se],serialize:e=>{if(typeof e!="boolean")throw new Error("Invalid input for boolean type");return e?"t":"f"},parse:e=>e==="t"},date:{to:le,from:[et,tt,le],serialize:e=>{if(typeof e=="string")return e;if(typeof e=="number")return new Date(e).toISOString();if(e instanceof Date)return e.toISOString();throw new Error("Invalid input for date type")},parse:e=>new Date(e)},bytea:{to:ae,from:[ae],serialize:e=>{if(!(e instanceof Uint8Array))throw new Error("Invalid input for bytea type");return"\\x"+Array.from(e).map(t=>t.toString(16).padStart(2,"0")).join("")},parse:e=>{let t=e.slice(2);return Uint8Array.from({length:t.length/2},(n,s)=>parseInt(t.substring(s*2,(s+1)*2),16))}}},ue=st(rt),En=ue.parsers,An=ue.serializers;function st(e){return Object.keys(e).reduce(({parsers:t,serializers:n},s)=>{let{to:r,from:l,serialize:a,parse:y}=e[s];return n[r]=a,n[s]=a,t[s]=y,Array.isArray(l)?l.forEach(p=>{t[p]=y,n[p]=a}):(t[l]=y,n[l]=a),{parsers:t,serializers:n}},{parsers:{},serializers:{}})}function ce(e){let t=e.find(n=>n.name==="parameterDescription");return t?t.dataTypeIDs:[]}var On=typeof process=="object"&&typeof process.versions=="object"&&typeof process.versions.node=="string";var ee=()=>{if(globalThis.crypto?.randomUUID)return globalThis.crypto.randomUUID();let e=new Uint8Array(16);if(globalThis.crypto?.getRandomValues)globalThis.crypto.getRandomValues(e);else for(let n=0;n<e.length;n++)e[n]=Math.floor(Math.random()*256);e[6]=e[6]&15|64,e[8]=e[8]&63|128;let t=[];return e.forEach(n=>{t.push(n.toString(16).padStart(2,"0"))}),t.slice(0,4).join("")+"-"+t.slice(4,6).join("")+"-"+t.slice(6,8).join("")+"-"+t.slice(8,10).join("")+"-"+t.slice(10).join("")};async function te(e,t,n,s){if(!n||n.length===0)return t;s=s??e;let r;try{await e.execProtocol(q.parse({text:t}),{syncToFs:!1}),r=ce((await e.execProtocol(q.describe({type:"S"}),{syncToFs:!1})).messages)}finally{await e.execProtocol(q.sync(),{syncToFs:!1})}let l=t.replace(/\$([0-9]+)/g,(y,p)=>"%"+p+"L");return(await s.query(`SELECT format($1, ${n.map((y,p)=>`$${p+2}`).join(", ")}) as query`,[l,...n],{paramTypes:[H,...r]})).rows[0].query}var at=5,it=async(e,t)=>{let n=new Set,s={async query(r,l,a){let y;typeof r!="string"&&(y=r.signal,l=r.params,a=r.callback,r=r.query);let p=a?[a]:[],c=ee().replace(/-/g,""),o=!1,E,L,S=async()=>{await e.transaction(async f=>{let h=await te(e,r,l,f);await f.query(`CREATE OR REPLACE TEMP VIEW live_query_${c}_view AS ${h}`),L=await pe(f,`live_query_${c}_view`),await de(f,L,n),await f.exec(`
            PREPARE live_query_${c}_get AS
            SELECT * FROM live_query_${c}_view;
          `),E=await f.query(`EXECUTE live_query_${c}_get;`)})};await S();let R=async(f=0)=>{if(p.length!==0){try{E=await e.query(`EXECUTE live_query_${c}_get;`)}catch(h){if(h.message===`prepared statement "live_query_${c}_get" does not exist`){if(f>at)throw h;await S(),R(f+1)}else throw h}z(p,E)}},$=await Promise.all(L.map(f=>e.listen(`table_change__${f.schema_name}__${f.table_name}`,async()=>{R()}))),v=f=>{if(o)throw new Error("Live query is no longer active and cannot be subscribed to");p.push(f)},B=async f=>{f?p=p.filter(h=>h!==h):p=[],p.length===0&&(o=!0,await Promise.all($.map(h=>h())),await e.exec(`
            DROP VIEW IF EXISTS live_query_${c}_view;
            DEALLOCATE live_query_${c}_get;
          `))};return y?.aborted?await B():y?.addEventListener("abort",()=>{B()},{once:!0}),z(p,E),{initialResults:E,subscribe:v,unsubscribe:B,refresh:R}},async changes(r,l,a,y){let p;if(typeof r!="string"&&(p=r.signal,l=r.params,a=r.key,y=r.callback,r=r.query),!a)throw new Error("key is required for changes queries");let c=y?[y]:[],o=ee().replace(/-/g,""),E=!1,L,S=1,R,$=async()=>{await e.transaction(async m=>{let A=await te(e,r,l,m);await m.query(`CREATE OR REPLACE TEMP VIEW live_query_${o}_view AS ${A}`),L=await pe(m,`live_query_${o}_view`),await de(m,L,n);let w=[...(await m.query(`
                SELECT column_name, data_type, udt_name
                FROM information_schema.columns 
                WHERE table_name = 'live_query_${o}_view'
              `)).rows,{column_name:"__after__",data_type:"integer"}];await m.exec(`
            CREATE TEMP TABLE live_query_${o}_state1 (LIKE live_query_${o}_view INCLUDING ALL);
            CREATE TEMP TABLE live_query_${o}_state2 (LIKE live_query_${o}_view INCLUDING ALL);
          `);for(let N of[1,2]){let _=N===1?2:1;await m.exec(`
              PREPARE live_query_${o}_diff${N} AS
              WITH
                prev AS (SELECT LAG("${a}") OVER () as __after__, * FROM live_query_${o}_state${_}),
                curr AS (SELECT LAG("${a}") OVER () as __after__, * FROM live_query_${o}_state${N}),
                data_diff AS (
                  -- INSERT operations: Include all columns
                  SELECT 
                    'INSERT' AS __op__,
                    ${w.map(({column_name:u})=>`curr."${u}" AS "${u}"`).join(`,
`)},
                    ARRAY[]::text[] AS __changed_columns__
                  FROM curr
                  LEFT JOIN prev ON curr.${a} = prev.${a}
                  WHERE prev.${a} IS NULL
                UNION ALL
                  -- DELETE operations: Include only the primary key
                  SELECT 
                    'DELETE' AS __op__,
                    ${w.map(({column_name:u,data_type:x,udt_name:X})=>u===a?`prev."${u}" AS "${u}"`:`NULL${x==="USER-DEFINED"?`::${X}`:""} AS "${u}"`).join(`,
`)},
                      ARRAY[]::text[] AS __changed_columns__
                  FROM prev
                  LEFT JOIN curr ON prev.${a} = curr.${a}
                  WHERE curr.${a} IS NULL
                UNION ALL
                  -- UPDATE operations: Include only changed columns
                  SELECT 
                    'UPDATE' AS __op__,
                    ${w.map(({column_name:u,data_type:x,udt_name:X})=>u===a?`curr."${u}" AS "${u}"`:`CASE 
                              WHEN curr."${u}" IS DISTINCT FROM prev."${u}" 
                              THEN curr."${u}"
                              ELSE NULL${x==="USER-DEFINED"?`::${X}`:""}
                              END AS "${u}"`).join(`,
`)},
                      ARRAY(SELECT unnest FROM unnest(ARRAY[${w.filter(({column_name:u})=>u!==a).map(({column_name:u})=>`CASE
                              WHEN curr."${u}" IS DISTINCT FROM prev."${u}" 
                              THEN '${u}' 
                              ELSE NULL 
                              END`).join(", ")}]) WHERE unnest IS NOT NULL) AS __changed_columns__
                  FROM curr
                  INNER JOIN prev ON curr.${a} = prev.${a}
                  WHERE NOT (curr IS NOT DISTINCT FROM prev)
                )
              SELECT * FROM data_diff;
            `)}})};await $();let v=async()=>{if(c.length===0&&R)return;let m=!1;for(let A=0;A<5;A++)try{await e.transaction(async w=>{await w.exec(`
                INSERT INTO live_query_${o}_state${S} 
                  SELECT * FROM live_query_${o}_view;
              `),R=await w.query(`EXECUTE live_query_${o}_diff${S};`),S=S===1?2:1,await w.exec(`
                TRUNCATE live_query_${o}_state${S};
              `)});break}catch(w){if(w.message===`relation "live_query_${o}_state${S}" does not exist`){m=!0,await $();continue}else throw w}lt(c,[...m?[{__op__:"RESET"}]:[],...R.rows])},B=await Promise.all(L.map(m=>e.listen(`table_change__${m.schema_name}__${m.table_name}`,async()=>v()))),f=m=>{if(E)throw new Error("Live query is no longer active and cannot be subscribed to");c.push(m)},h=async m=>{m?c=c.filter(A=>A!==A):c=[],c.length===0&&(E=!0,await Promise.all(B.map(A=>A())),await e.exec(`
            DROP VIEW IF EXISTS live_query_${o}_view;
            DROP TABLE IF EXISTS live_query_${o}_state1;
            DROP TABLE IF EXISTS live_query_${o}_state2;
            DEALLOCATE live_query_${o}_diff1;
            DEALLOCATE live_query_${o}_diff2;
          `))};return p?.aborted?await h():p?.addEventListener("abort",()=>{h()},{once:!0}),await v(),{fields:R.fields.filter(m=>!["__after__","__op__","__changed_columns__"].includes(m.name)),initialChanges:R.rows,subscribe:f,unsubscribe:h,refresh:v}},async incrementalQuery(r,l,a,y){let p;if(typeof r!="string"&&(p=r.signal,l=r.params,a=r.key,y=r.callback,r=r.query),!a)throw new Error("key is required for incremental queries");let c=y?[y]:[],o=new Map,E=new Map,L=[],S=!0,{fields:R,unsubscribe:$,refresh:v}=await s.changes(r,l,a,h=>{for(let A of h){let{__op__:w,__changed_columns__:N,..._}=A;switch(w){case"RESET":o.clear(),E.clear();break;case"INSERT":o.set(_[a],_),E.set(_.__after__,_[a]);break;case"DELETE":{let u=o.get(_[a]);o.delete(_[a]),u.__after__!==null&&E.delete(u.__after__);break}case"UPDATE":{let u={...o.get(_[a])??{}};for(let x of N)u[x]=_[x],x==="__after__"&&E.set(_.__after__,_[a]);o.set(_[a],u);break}}}let O=[],m=null;for(let A=0;A<o.size;A++){let w=E.get(m),N=o.get(w);if(!N)break;let _={...N};delete _.__after__,O.push(_),m=w}L=O,S||z(c,{rows:O,fields:R})});S=!1,z(c,{rows:L,fields:R});let B=h=>{c.push(h)},f=async h=>{h?c=c.filter(O=>O!==O):c=[],c.length===0&&await $()};return p?.aborted?await f():p?.addEventListener("abort",()=>{f()},{once:!0}),{initialResults:{rows:L,fields:R},subscribe:B,unsubscribe:f,refresh:v}}};return{namespaceObj:s}},ot={name:"Live Queries",setup:it};async function pe(e,t){let n=new Map;async function s(r){let l=await e.query(`
        SELECT DISTINCT
          cl.relname AS table_name,
          n.nspname AS schema_name,
          cl.relkind = 'v' AS is_view
        FROM pg_rewrite r
        JOIN pg_depend d ON r.oid = d.objid
        JOIN pg_class cl ON d.refobjid = cl.oid
        JOIN pg_namespace n ON cl.relnamespace = n.oid
        WHERE
        r.ev_class = (
            SELECT oid FROM pg_class WHERE relname = $1 AND relkind = 'v'
        )
        AND d.deptype = 'n';
      `,[r]);for(let a of l.rows)if(a.table_name!==r&&!a.is_view){let y=`"${a.schema_name}"."${a.table_name}"`;n.has(y)||n.set(y,{table_name:a.table_name,schema_name:a.schema_name})}else a.is_view&&await s(a.table_name)}return await s(t),Array.from(n.values())}async function de(e,t,n){let s=t.filter(r=>!n.has(`${r.schema_name}_${r.table_name}`)).map(r=>`
      CREATE OR REPLACE FUNCTION "_notify_${r.schema_name}_${r.table_name}"() RETURNS TRIGGER AS $$
      BEGIN
        PERFORM pg_notify('table_change__${r.schema_name}__${r.table_name}', '');
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;
      CREATE OR REPLACE TRIGGER "_notify_trigger_${r.schema_name}_${r.table_name}"
      AFTER INSERT OR UPDATE OR DELETE ON "${r.schema_name}"."${r.table_name}"
      FOR EACH STATEMENT EXECUTE FUNCTION "_notify_${r.schema_name}_${r.table_name}"();
      `).join(`
`);s.trim()!==""&&await e.exec(s),t.map(r=>n.add(`${r.schema_name}_${r.table_name}`))}var z=(e,t)=>{for(let n of e)n(t)},lt=(e,t)=>{for(let n of e)n(t)};0&&(module.exports={live});
//# sourceMappingURL=index.cjs.map