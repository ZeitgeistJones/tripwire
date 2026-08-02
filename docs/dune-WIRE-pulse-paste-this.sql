-- The Wire pulse (lean) - paste into Dune query 7765068
-- 24h scan only: raw wallets + txs for 15m / 1h / 6h / 24h
-- No first-time / new-buyer / new-seller paths (those forced the old 90d cost)
-- Contract list synced from lib/tokens.js (110 addresses)

WITH agentic_contracts AS (
    SELECT address, name FROM (
        VALUES
        -- AGENT INDEPENDENT
        (0x0b3e328455c4059EEb9e3f84b5543F74E24e7E1b, 'Virtuals Protocol'),
        (0x1bc0c42215582d5a085795f4badbac3ff36d1bcb, 'Clanker'),
        (0xacfE6019Ed1A7Dc6f7B508C02d1b04ec88cC21bf, 'Venice'),
        (0x1b4617734c43f6159f3a70b7e06d883647512778, 'AWE'),
        (0xb33Ff54b9F7242EF1593d2C9Bcd8f9df46c77935, 'FAI'),
        (0x22af33fe49fd1fa80c7149773dde5890d3c76f3b, 'Bankr'),
        (0xbdf317f9c153246c429f23f4093087164b145390, 'AI Agent Layer'),
        (0xcc4adb618253ed0d4d8a188fb901d70c54735e03, 'Agent Zero'),
        (0xea17df5cf6d172224892b5477a16acb111182478, 'ElizaOS'),
        (0x54330d28ca3357f294334bdc454a032e7f353416, 'Autonolas'),
        (0xc0041ef357b183448b235a8ea73ce4e4ec8c265f, 'Cookie DAO'),
        (0xd71552d9e08e5351adb52163b3bbbc4d7de53ce1, 'AITECH Cloud Network'),
        (0x7431ada8a591c955a994a21710752ef9b882b8e3, 'Morpheus AI'),
        (0x97c806e7665d3afd84a8fe1837921403d59f3dcc, 'Artificial Liquid Intelligence'),
        (0x000000000000012def132e61759048be5b5c6033, 'Cortex'),
        (0x29cc30f9d113b356ce408667aa6433589cecbdca, 'Elsa'),
        (0x30c7235866872213f68cb1f08c37cb9eccb93452, 'Wayfinder'),
        (0x810affc8aadad2824c65e0a2c5ef96ef1de42ba3, 'AXOBOTL'),
        (0xB3D7e0c3C39A1D3F1B304663065A2F83Ddf56d8e, 'AUTONOMOPOLY'),
        (0x0086cFF0c1E5D17b19F5bCd4c8840a5B4251D959, 'ODEI AI'),
        (0xdd32659b1e7a6a6b3c6e96cd8a4c936bcfea0607, 'Trackgood AI'),
        (0xb2aca4ca8b7bbd9a5388ccb044c87dedf8a51c7c, 'Thirdfy'),
        (0xf27b8ef47842E6445E37804896f1BC5e29381b07, 'Doppel'),
        (0x494C4cf6C8F971DDfCa95184282b86220FAB9B07, 'Amper'),
        (0xF714E60f85497D70508F7E356b5DB80e64539BA3, 'PerkOS'),
        (0x09f87F948C88848363B124C9099CbB58E4Cc7cB6, 'Messy Virgo'),
        (0xb886cf1444bff05e9a99e00543bc4054d423ebfd, 'Toriva'),
        (0x161e113b8e9bbaefb846f73f31624f6f9607bd44, 'SIMMI'),
        (0x7ffd8f91b0b1b5c7a2e6c7c9efb8be0a71885b07, 'ARGUE.FUN'),
        (0xc78fAbC2cB5B9cf59E0Af3Da8E3Bc46d47753A4e, 'Osobot'),
        (0x7Ce02e86354EA0Cc3b302AeAdC0Ab56bC7EB44b8, 'SIRE'),
        (0x9d56c29e820Dd13b0580B185d0e0Dc301d27581d, 'Aubrai'),
        (0xfc48314ad4aD5bD36a84E8307b86A68A01D95d9C, 'AION 5100'),
        (0x7300B37DfdfAb110d83290A29DfB31B1740219fE, 'Mamo'),
        -- AGENT VIA VIRTUALS
        (0x96419929d7949d6a801a6909c145c8eef6a40431, 'Spectral'),
        (0x4f9fd6be4a90f2620860d680c0d4d5fb53d1a825, 'AIXBT'),
        (0xC44141a684f6AA4E36cD9264ab55550B03C88643, 'Ethy AI'),
        (0x58Db197E91Bc8Cf1587F75850683e4bd0730e6BF, 'Axelrod'),
        (0x1c4cca7c5db003824208adda61bd749e55f463a3, 'GAME by Virtuals'),
        (0x2d90785e30a9df6cce329c0171cb8ba0f4a5c17b, 'BYTE by Virtuals'),
        (0xea87169699dabd028a78d4b91544b4298086baf6, 'SWARM'),
        (0x1a43287cbfcc5f35082e6e2aa98e5b474fe7bd4e, 'Athena'),
        (0x4b5D32A07b8d3eC5D6928cAa30196f8dd6a7C5A9, 'PRXVT'),
        (0x15B15FA54b629C634958E8BD639b2fc8af654974, 'Litebeam'),
        (0x05B1266DDCeE093cE060DBF697e230EA9B453633, 'ReplyCorp'),
        (0xA9E23871156718C1D55e90dad1c4ea8a33480DFd, 'Instaclaw'),
        (0xdd78523217390bb0d49C7601e7e54C36d71622F0, 'Chromia EVAL'),
        (0xd63F21E7f4205d59c5b486273C42e261d5CD4d1d, 'BLACK HOLE'),
        (0xc655C331d1Aa7f96c252F1f40CE13D80eAc53504, 'Music by Virtuals'),
        (0x645C7Aa841087E2e7f741C749aB27422fF5BbA8E, 'Iona'),
        (0xdcaa5e062b2be18e52ea6ed7ba232538621ddc10, 'Aurra'),
        (0xcf67815cce72e682eb4429eca46843bed81ca739, 'GAM3S.GG'),
        (0x84a9aae8fcc085dbe11524f570716d89b772f430, 'DTRXBT'),
        (0xab964f7b7b6391bd6c4e8512ef00d01f255d9c0d, 'CONVO'),
        (0x8dd524a86195a6ef95304e7f0dd9c405a2e78859, 'Sage'),
        (0xe095b8127823708dc07e739ef4149050acc836e7, 'A.T.M.'),
        (0xabd3718656dbb5547d6b426c18b03848d18981ea, 'Wakehacker'),
        (0x164239fa94aec9c4e437bf6890ea8602b759fd74, 'VERONICA'),
        (0x64712FbDF19aE8b5B3B6D0478750E3D5e1A17718, 'Waveform'),
        (0xa023316FA5c85dADF008C611790B3235433e781e, 'MUTE SWAP'),
        (0x511ef9Ad5E645E533D15DF605B4628e3D0d0Ff53, 'Velvet Unicorn'),
        (0x5F6a682A58854C7fBE228712aEEFfcCDe0008Ac0, 'Rabbi Schlomo'),
        (0x80Ded22d9c6487181Ed74D0222Add805815e8dF4, 'Cybercentry'),
        (0xaeA742f80922f7C94B8FD91686c9dFbDFE90d9E6, 'Predi'),
        (0x6AF73D4579c70A24D52e4F4b43EeCB2A75019F94, 'Replicat-One'),
        (0x3b92844c5abd9f0562c71ebf219628f1676a856d, 'Starly'),
        (0x9e271ec4d66f2b400ad92de8a10e5c9c1914259c, 'Upsider AI'),
        (0xa66f68ef2d8091e13585a502464bd11a159cf710, 'Jeff CEO'),
        (0x99956f143dcca77cddf4b4b2a0fa4d491703244d, 'LYRA'),
        (0x0b3AE50BaBE7FFa4E1A50569ceE6bDEFd4ccAeE0, '717ai'),
        (0x352b850b733ab8baB50aED1Dab5D22E3186ce984, '1000x'),
        (0x797f214a2CD64a4963A91Fa21c8C55Ec3EBa4714, 'SIBYL'),
        (0x79dacb99A8698052a9898E81Fdf883c29efb93cb, 'Acolyte'),
        (0x1A3e429D2D22149Cc61e0f539B112a227c844aa3, 'Loky'),
        (0xf7b0dd0B642a6ccc2fc4d8FfE2BfFb0caC8C43C8, 'Gekko AI'),
        (0x4674F73545F1db4036250ff8C33A39ad1678D864, 'Degenerate SQuiD'),
        (0x708c2B2eEb9578dFe4020895139E88F7654647Ff, 'Robostack'),
        (0xE74731ba9d1Da6Fd3C8c60Ff363732bebAc5273E, 'maicrotrader'),
        (0x22c0a2e55AeD8B317A285ccbd4f3D8eE24C9e5e3, 'Fyni AI'),
        (0x7d6fcB3327D7E17095fA8B0E3513AC7A3564f5E1, 'Solace'),
        (0x83AbFC4bEEC2ecf12995005d751a42df691c09c1, 'H1DR4'),
        (0xc796E499CC8f599A2a8280825d8BdA92F7a895e0, 'Neurobro'),
        (0xbfa733702305280F066D470afDFA784fA70e2649, 'Capminal'),
        (0x380337d0180db7D0DF76ac4fAaE2fcea908EE1fC, 'Otto AI'),
        (0x815269D17C10f0F3dF7249370E0c1B9efe781aa8, 'SANTA'),
        (0x98aC5B33A4Ef1151f138941c979211599c2fF953, 'VPay'),
        (0xFAC77f01957ed1B3DD1cbEa992199B8f85B6E886, 'ArAIstotle'),
        (0xe2816b27a5613b0aaf5d6dafa80584156e2fb1b6, 'Jaihoz'),
        (0x072915a43ac255cde1fa568218e5b6b10d0cb10f, 'Maya World'),
        (0x54eaf6bb665565bb8897f9d7ad5b3818ded143b4, 'Degen AI'),
        (0x4d70f1058b73198f12a76c193aef5db5dd75babd, 'nomAI'),
        (0x33479a07983561ab5e27ad435399fc88159eea8b, 'Kolwaii'),
        (0xcc9ad02796dec5f4f0710df80c1f011af85eb9e1, 'WachAI'),
        (0x06abb84958029468574b28b6e7792a770ccaa2f6, '0xMonk'),
        (0xce1eab31756a48915b7e7bb79c589835aac6242d, 'Gigabrain'),
        (0x91273b316240879fd902c0c3fcf7c0158777b42f, 'Olyn'),
        (0x3b313f5615bbd6b200c71f84ec2f677b94df8674, 'Gloria AI'),
        -- CLANKER VIA BANKRBOT PREFORK
        (0x9f86db9fc6f7c9408e8fda3ff8ce4e78ac7a6b07, 'CLAWD'),
        (0xa1f72459dfa10bad200ac160ecd78c6b77a747be, 'Clawnch'),
        (0x50d2280441372486beecdd328c1854743ebacb07, 'KellyClaude'),
        (0xf30bf00edd0c22db54c9274b90d2a4c21fc09b07, 'FELIX'),
        (0x4e6c9f48f73e54ee5f3ab7e2992b2d733d0d0b07, 'Juno Agent'),
        -- AGENT VIA CLANKER
        (0x7D928816CC9c462DD7adef911De41535E444CB07, 'Faircaster'),
        (0xde61878b0b21ce395266c44d4d548d1c72a3eb07, 'Sairi'),
        (0xD88FD4a11255E51f64F78b4a7d74456325c2d8dC, 'BitVault Signal'),
        -- AGENT VIA BANKR
        (0x16332535E2c27da578bC2e82bEb09Ce9d3C8EB07, 'ClawBank'),
        (0x5f980dcfc4c0fa3911554cf5ab288ed0eb13dba3, 'Gitlawb'),
        (0x9326314259102cfb0448e3a5022188d56e61cba3, 'SMC Factory'),
        -- NON-AGENT VIA BANKR
        (0xc52aedec3374422d7510e294cfaa90799595cba3, 'Surplus Intelligence'),
        (0x572c4fA77623652411574c51B5dDB7e1b750AbA3, 'Supergemma4-26b-multimodal')
    ) AS t(address, name)
),

recent_tx AS (
    SELECT
        ac.name  AS project,
        t."from" AS wallet,
        t.block_time
    FROM base.transactions t
    INNER JOIN agentic_contracts ac ON t."to" = ac.address
    WHERE t.success = true
      AND t.block_time >= now() - interval '24' hour
),

activity_pulse AS (
    SELECT
        project,
        COUNT(*)               FILTER (WHERE block_time >= now() - interval '15' minute) AS txs_15m,
        COUNT(DISTINCT wallet) FILTER (WHERE block_time >= now() - interval '15' minute) AS wallets_15m,
        COUNT(*)               FILTER (WHERE block_time >= now() - interval '1'  hour)   AS txs_1h,
        COUNT(DISTINCT wallet) FILTER (WHERE block_time >= now() - interval '1'  hour)   AS wallets_1h,
        COUNT(*)               FILTER (WHERE block_time >= now() - interval '6'  hour)   AS txs_6h,
        COUNT(DISTINCT wallet) FILTER (WHERE block_time >= now() - interval '6'  hour)   AS wallets_6h,
        COUNT(*)               FILTER (WHERE block_time >= now() - interval '24' hour)   AS txs_24h,
        COUNT(DISTINCT wallet) FILTER (WHERE block_time >= now() - interval '24' hour)   AS wallets_24h
    FROM recent_tx
    GROUP BY 1
)

SELECT
    ap.project     AS "Project",
    ap.wallets_15m AS "Wallets 15m",
    ap.txs_15m     AS "Txs 15m",
    ap.wallets_1h  AS "Wallets 1h",
    ap.txs_1h      AS "Txs 1h",
    ap.wallets_6h  AS "Wallets 6h",
    ap.txs_6h      AS "Txs 6h",
    ap.wallets_24h AS "Wallets 24h",
    ap.txs_24h     AS "Txs 24h"
FROM activity_pulse ap
ORDER BY ap.txs_15m DESC;
